import openpyxl
import json
import os
from datetime import datetime

def safe_float(v, default=0.0):
    try:
        if v is None: return default
        return float(v)
    except:
        return default

def clean_val(v):
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.strftime('%Y-%m-%d')
    return v

def parse_all():
    file_perf = r'c:\Users\hamza\OneDrive\Desktop\Engro Connect\C4 Overall Performance Aug-2026 (2).xlsx'
    file_fuel = r'c:\Users\hamza\OneDrive\Desktop\Engro Connect\C-4 Daily Deodar Fuel Activity Report 30th August-2026.xlsx'
    
    print('Loading Performance workbook...')
    wb_perf = openpyxl.load_workbook(file_perf, read_only=True, data_only=True)
    
    # 1. Parse E2E and Deodar NAR
    ws = wb_perf['E2E & Deodar NAR']
    rows = list(ws.iter_rows(values_only=True))
    dates = []
    for cell in rows[0][1:]:
        if cell is not None:
            if isinstance(cell, datetime):
                dates.append(cell.strftime('%Y-%m-%d'))
            else:
                dates.append(str(cell).split()[0])
    
    deodar_nar_daily = {}
    e2e_nar_daily = {}
    for idx, d in enumerate(dates):
        if idx + 1 < len(rows[1]):
            val = rows[1][idx + 1]
            if val is not None:
                try: deodar_nar_daily[d] = round(float(val) * 100, 2)
                except: pass
        if idx + 1 < len(rows[2]):
            val = rows[2][idx + 1]
            if val is not None:
                try: e2e_nar_daily[d] = round(float(val) * 100, 2)
                except: pass

    # 2. Parse DateWiseDT (MBU daily NAR)
    ws = wb_perf['DateWiseDT']
    rows = list(ws.iter_rows(values_only=True))
    mbu_list = [r for r in rows[0][1:] if r is not None]
    mbu_daily_nar = {mbu: {} for mbu in mbu_list}
    for row in rows[1:]:
        if not row[0]: continue
        d = clean_val(row[0])
        if isinstance(d, str) and ' ' in d:
            d = d.split()[0]
        for idx, mbu in enumerate(mbu_list):
            if idx + 1 < len(row) and row[idx + 1] is not None:
                try:
                    mbu_daily_nar[mbu][d] = round(float(row[idx + 1]) * 100, 2)
                except: pass

    # 3. Parse MBUWiseContribution (TDT and T-NAR)
    ws = wb_perf['MBUWiseContribution']
    mbu_totals = {}
    for row in ws.iter_rows(values_only=True):
        if row[0] and str(row[0]).startswith('C4-'):
            mbu = str(row[0]).strip()
            tdt = float(row[1]) if row[1] is not None else 0
            tnar = float(row[2]) if row[2] is not None else 0
            mbu_totals[mbu] = {
                'tdtMinutes': round(tdt / 60, 1),
                'tnar': round(tnar * 100, 2)
            }

    # 4. Parse Elite-Platinum Summary
    ws = wb_perf['Elite-Platinum Graphs']
    rows = list(ws.iter_rows(values_only=True))
    elite_platinum_summary = {
        'elite': {'nar': round(float(rows[1][1]) * 100, 2) if rows[1][1] else 0, 'totalSites': int(rows[1][2]) if rows[1][2] else 0},
        'platinum': {'nar': round(float(rows[1][4]) * 100, 2) if rows[1][4] else 0, 'totalSites': int(rows[1][5]) if rows[1][5] else 0},
    }

    # 5. Parse Site NAR-Day (Per site daily NAR)
    ws = wb_perf['Site NAR-Day']
    site_nar_rows = list(ws.iter_rows(values_only=True))
    site_nar_dates = []
    for c in site_nar_rows[0][8:]:
        if c is not None:
            if isinstance(c, datetime):
                site_nar_dates.append(c.strftime('%Y-%m-%d'))
            else:
                site_nar_dates.append(str(c).split()[0])
    
    site_nar_list = []
    for r in site_nar_rows[1:]:
        if not r[1]: continue
        site_code = str(r[1]).strip()
        site_name = str(r[2]).strip() if r[2] else ''
        mbu = str(r[4]).strip() if r[4] else ''
        daily = {}
        for idx, d in enumerate(site_nar_dates):
            if 8 + idx < len(r) and r[8 + idx] is not None:
                try: daily[d] = round(float(r[8 + idx]) * 100, 1)
                except: pass
        
        vals = list(daily.values())
        avg_nar = round(sum(vals) / len(vals), 2) if vals else 100.0
        
        site_nar_list.append({
            'code': site_code,
            'name': site_name,
            'mbu': mbu,
            'avgNar': avg_nar,
            'daily': daily
        })

    print(f'Parsed {len(site_nar_list)} sites with daily NAR data.')

    # 6. Parse Outage Categories
    ws = wb_perf['Outage Category']
    outage_categories = []
    for r in list(ws.iter_rows(values_only=True))[1:]:
        if r[0] and r[1]:
            outage_categories.append({'reason': str(r[0]).strip(), 'domain': str(r[1]).strip()})

    wb_perf.close()

    print('Loading Fuel workbook...')
    wb_fuel = openpyxl.load_workbook(file_fuel, read_only=True, data_only=True)

    # 7. Fuel Summary
    ws = wb_fuel['Summary']
    fuel_summary_daily = []
    for r in list(ws.iter_rows(values_only=True))[3:]:
        if len(r) > 7 and r[1] is not None:
            d = clean_val(r[1])
            if isinstance(d, str) and ' ' in d: d = d.split()[0]
            if not isinstance(d, str) or not d.startswith('2026-'): continue
            scratching = safe_float(r[2], 0)
            pouring = safe_float(r[5], 0)
            inhand = safe_float(r[7], 0)
            fuel_summary_daily.append({
                'date': d,
                'scratching': scratching,
                'pouring': pouring,
                'inhand': inhand
            })

    # 8. MBU Wise Fuel Detail
    ws = wb_fuel['Fuel Detail MBU Wise ']
    fuel_mbu_rows = list(ws.iter_rows(values_only=True))
    fuel_mbu_headers = [str(x).strip() for x in fuel_mbu_rows[1][2:10] if x is not None]
    fuel_mbu_daily = []
    for r in fuel_mbu_rows[2:]:
        if r[1] is not None:
            d = clean_val(r[1])
            if isinstance(d, str) and ' ' in d: d = d.split()[0]
            entry = {'date': d}
            total = 0
            for idx, mbu in enumerate(fuel_mbu_headers):
                if 2 + idx < len(r) and r[2 + idx] is not None:
                    try:
                        val = float(r[2 + idx])
                        entry[mbu] = val
                        total += val
                    except: pass
            entry['total'] = total
            fuel_mbu_daily.append(entry)

    # 9. Vehicle Wise Fuel Detail
    ws = wb_fuel['Vehicle Wise Fuel Detail']
    vehicle_rows = list(ws.iter_rows(values_only=True))
    v_dates = []
    for c in vehicle_rows[2][5:]:
        if c is not None:
            if isinstance(c, datetime): v_dates.append(c.strftime('%Y-%m-%d'))
            else: v_dates.append(str(c).split()[0])
    
    vehicles = []
    for r in vehicle_rows[3:]:
        if not r[1]: continue
        v_no = str(r[1]).strip()
        fso = str(r[2]).strip() if r[2] else ''
        area = str(r[3]).strip() if r[3] else ''
        mbu = str(r[4]).strip() if r[4] else ''
        v_daily = {}
        v_total = 0
        for idx, d in enumerate(v_dates):
            if 5 + idx < len(r) and r[5 + idx] is not None:
                try:
                    val = float(r[5 + idx])
                    v_daily[d] = val
                    v_total += val
                except: pass
        vehicles.append({
            'vehicleNo': v_no,
            'fsoName': fso,
            'area': area,
            'mbu': mbu,
            'totalFuel': v_total,
            'daily': v_daily
        })

    # 10. Site Pouring Logs
    ws = wb_fuel['⛽Pouring']
    pouring_logs = []
    for r in list(ws.iter_rows(values_only=True))[2:]:
        if not r[1]: continue
        p_date = clean_val(r[8])
        if isinstance(p_date, str) and ' ' in p_date: p_date = p_date.split()[0]
        try: poured = float(r[10]) if r[10] is not None else 0
        except: poured = 0
        try: balance = float(r[9]) if r[9] is not None else 0
        except: balance = 0
        pouring_logs.append({
            'siteCode': str(r[1]).strip(),
            'siteName': str(r[2]).strip() if r[2] else '',
            'mbu': str(r[4]).strip() if r[4] else '',
            'vendor': str(r[5]).strip() if r[5] else '',
            'siteStatus': str(r[6]).strip() if r[6] else '',
            'visitNature': str(r[7]).strip() if r[7] else '',
            'date': p_date,
            'fuelBal': balance,
            'fuelPoured': poured,
            'vehicleNo': str(r[19]).strip() if len(r) > 19 and r[19] else '',
            'createdBy': str(r[16]).strip() if len(r) > 16 and r[16] else ''
        })

    # 11. Scratching Cards Logs
    ws = wb_fuel['💳Scratching']
    scratching_logs = []
    for r in list(ws.iter_rows(values_only=True))[2:]:
        if not r[1]: continue
        s_date = clean_val(r[9])
        if isinstance(s_date, str) and ' ' in s_date: s_date = s_date.split()[0]
        try: qty = float(r[11]) if len(r) > 11 and r[11] is not None else 0
        except: qty = 0
        scratching_logs.append({
            'cardCode': str(r[1]).strip(),
            'fuelCompany': str(r[2]).strip() if len(r) > 2 and r[2] else '',
            'vendor': str(r[3]).strip() if len(r) > 3 and r[3] else '',
            'cardName': str(r[4]).strip() if len(r) > 4 and r[4] else '',
            'cardNumber': str(r[5]).strip() if len(r) > 5 and r[5] else '',
            'cardLimit': float(r[6]) if len(r) > 6 and r[6] is not None else 0,
            'mbu': str(r[7]).strip() if len(r) > 7 and r[7] else '',
            'region': str(r[8]).strip() if len(r) > 8 and r[8] else '',
            'date': s_date,
            'quantity': qty,
            'station': str(r[12]).strip() if len(r) > 12 and r[12] else ''
        })

    # 12. Site DG Profiles
    ws = wb_fuel['Site Detail']
    site_dg_profiles = []
    for r in list(ws.iter_rows(values_only=True))[1:]:
        if not r[0]: continue
        cf = None
        if len(r) > 9 and r[9] is not None:
            try:
                cf = float(r[9])
            except:
                cf = None
        site_dg_profiles.append({
            'siteCode': str(r[0]).strip(),
            'siteName': str(r[1]).strip() if len(r) > 1 and r[1] else '',
            'mbu': str(r[2]).strip() if len(r) > 2 and r[2] else '',
            'flmVendor': str(r[3]).strip() if len(r) > 3 and r[3] else '',
            'secVendor': str(r[4]).strip() if len(r) > 4 and r[4] else '',
            'dgKva': str(r[6]).strip() if len(r) > 6 and r[6] is not None else '',
            'engineBrand': str(r[7]).strip() if len(r) > 7 and r[7] else '',
            'dgBrand': str(r[8]).strip() if len(r) > 8 and r[8] else '',
            'consumptionFactor': cf
        })

    wb_fuel.close()

    analytics_data = {
        'dates': dates,
        'mbuList': mbu_list,
        'nar': {
            'wholeC4': {
                'deodarDaily': deodar_nar_daily,
                'e2eDaily': e2e_nar_daily,
                'avgDeodar': round(sum(deodar_nar_daily.values()) / max(len(deodar_nar_daily), 1), 2),
                'avgE2E': round(sum(e2e_nar_daily.values()) / max(len(e2e_nar_daily), 1), 2),
            },
            'mbuDaily': mbu_daily_nar,
            'mbuTotals': mbu_totals,
            'elitePlatinum': elite_platinum_summary,
            'outageCategories': outage_categories,
            'sites': site_nar_list
        },
        'fuel': {
            'summaryDaily': fuel_summary_daily,
            'totalScratched': sum(x['scratching'] for x in fuel_summary_daily),
            'totalPoured': sum(x['pouring'] for x in fuel_summary_daily),
            'mbuDaily': fuel_mbu_daily,
            'vehicles': vehicles,
            'pouringLogs': pouring_logs,
            'scratchingLogs': scratching_logs,
            'siteDgProfiles': site_dg_profiles
        }
    }

    out_file = r'c:\Users\hamza\OneDrive\Desktop\Engro Connect\src\analyticsData.ts'
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write('// @ts-nocheck\nexport const analyticsData = ')
        json.dump(analytics_data, f, separators=(',', ':'))
        f.write(';\n')

    print(f'Analytics Data exported successfully to {out_file} (Size: {os.path.getsize(out_file) / 1024:.1f} KB)')

if __name__ == '__main__':
    parse_all()
