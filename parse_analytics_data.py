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
    if v is None: return None
    if isinstance(v, datetime): return v.strftime('%Y-%m-%d')
    return str(v).split()[0] if ' ' in str(v) else str(v)

def parse_all():
    file_perf = r"c:\Users\hamza\OneDrive\Desktop\Engro Connect\C4 Overall Performance Aug-2026 (2).xlsx"
    file_fuel = r"c:\Users\hamza\OneDrive\Desktop\Engro Connect\C-4 Daily Deodar Fuel Activity Report 30th August-2026.xlsx"

    print("Loading Performance workbook...")
    wb_perf = openpyxl.load_workbook(file_perf, read_only=True, data_only=True)

    # 1. Parse E2E & Deodar NAR (27 active days)
    ws = wb_perf['E2E & Deodar NAR']
    rows = list(ws.iter_rows(values_only=True))
    dates = []
    for cell in rows[0][1:]:
        if cell is not None:
            dates.append(clean_val(cell))

    deodar_daily = {}
    e2e_daily = {}
    for idx, d in enumerate(dates):
        if idx + 1 < len(rows[1]) and rows[1][idx + 1] is not None:
            try: deodar_daily[d] = round(float(rows[1][idx + 1]) * 100, 2)
            except: pass
        if idx + 1 < len(rows[2]) and rows[2][idx + 1] is not None:
            try: e2e_daily[d] = round(float(rows[2][idx + 1]) * 100, 2)
            except: pass

    active_dates = list(deodar_daily.keys())
    avg_deodar = round(sum(deodar_daily.values()) / max(len(deodar_daily), 1), 2)
    avg_e2e = round(sum(e2e_daily.values()) / max(len(e2e_daily), 1), 2)

    # 2. Parse DateWiseDT (MBU daily NAR)
    ws = wb_perf['DateWiseDT']
    rows = list(ws.iter_rows(values_only=True))
    mbu_list = [str(r).strip() for r in rows[0][1:9] if r is not None]
    mbu_daily_nar = {mbu: {} for mbu in mbu_list}
    for r in rows[1:]:
        if not r[0]: continue
        d = clean_val(r[0])
        if d not in active_dates: continue
        for idx, mbu in enumerate(mbu_list):
            if idx + 1 < len(r) and r[idx + 1] is not None:
                try: mbu_daily_nar[mbu][d] = round(float(r[idx + 1]) * 100, 2)
                except: pass

    # 3. Parse MBUWiseDT (MBU daily Downtime in hours)
    ws = wb_perf['MBUWiseDT']
    rows = list(ws.iter_rows(values_only=True))
    mbu_daily_dt = {mbu: {} for mbu in mbu_list}
    for r in rows[1:9]:
        mbu = str(r[0]).strip()
        if mbu in mbu_daily_dt:
            for idx, d in enumerate(active_dates):
                if idx + 1 < len(r) and r[idx + 1] is not None:
                    mbu_daily_dt[mbu][d] = round(safe_float(r[idx + 1]) / 60, 1)

    # 4. Parse MBUWiseContribution (Official TDT & TNAR)
    ws = wb_perf['MBUWiseContribution']
    mbu_totals = {}
    for r in list(ws.iter_rows(values_only=True))[1:10]:
        if r[0] and str(r[0]).startswith('C4-'):
            mbu = str(r[0]).strip()
            tdt_min = round(safe_float(r[1]) / 60, 1)
            tnar = round(safe_float(r[2]) * 100, 2)
            mbu_totals[mbu] = {'tdtMinutes': tdt_min, 'tnar': tnar}

    # 5. Elite-Platinum
    ws = wb_perf['Elite-Platinum Graphs']
    rows = list(ws.iter_rows(values_only=True))
    elite_platinum = {
        'elite': {'nar': round(float(rows[1][1]) * 100, 2) if rows[1][1] else 0, 'totalSites': int(rows[1][2]) if rows[1][2] else 0},
        'platinum': {'nar': round(float(rows[1][4]) * 100, 2) if rows[1][4] else 0, 'totalSites': int(rows[1][5]) if rows[1][5] else 0}
    }

    # 6. Site NAR-Day
    ws = wb_perf['Site NAR-Day']
    site_nar_rows = list(ws.iter_rows(values_only=True))
    site_nar_dates = [clean_val(c) for c in site_nar_rows[0][8:35] if c is not None]
    sites_nar = []
    for r in site_nar_rows[1:]:
        if not r[1]: continue
        site_code = str(r[1]).strip()
        site_name = str(r[2]).strip() if r[2] else ''
        mbu = str(r[4]).strip() if r[4] else ''
        daily = {}
        for idx, d in enumerate(site_nar_dates):
            if idx < len(active_dates) and 8 + idx < len(r) and r[8 + idx] is not None:
                daily[d] = round(safe_float(r[8 + idx]) * 100, 1)
        vals = list(daily.values())
        avg_nar = round(sum(vals) / len(vals), 2) if vals else 100.0
        sites_nar.append({
            'code': site_code,
            'name': site_name,
            'mbu': mbu,
            'avgNar': avg_nar,
            'daily': daily
        })

    # 7. Outage Category
    ws = wb_perf['Outage Category']
    outage_categories = []
    for r in list(ws.iter_rows(values_only=True))[1:]:
        if r[0] and r[1]:
            outage_categories.append({'reason': str(r[0]).strip(), 'domain': str(r[1]).strip()})

    wb_perf.close()
    print(f"Parsed {len(sites_nar)} sites with daily NAR data.")

    # 8. Parse Fuel Data
    print("Loading Fuel workbook...")
    wb_fuel = openpyxl.load_workbook(file_fuel, read_only=True, data_only=True)

    # 8a. Fuel Summary
    ws = wb_fuel['Summary']
    fuel_summary_daily = []
    for r in list(ws.iter_rows(values_only=True))[3:]:
        if len(r) > 7 and r[1] is not None:
            d = clean_val(r[1])
            if not isinstance(d, str) or not d.startswith('2026-'): continue
            fuel_summary_daily.append({
                'date': d,
                'scratching': safe_float(r[2], 0),
                'pouring': safe_float(r[5], 0),
                'inhand': safe_float(r[7], 0)
            })

    # 8b. MBU Wise Fuel Detail
    ws = wb_fuel['Fuel Detail MBU Wise ']
    fuel_mbu_rows = list(ws.iter_rows(values_only=True))
    fuel_mbu_headers = [str(x).strip() for x in fuel_mbu_rows[1][2:10] if x is not None]
    fuel_mbu_daily = []
    for r in fuel_mbu_rows[2:]:
        if r[1] is not None:
            d = clean_val(r[1])
            entry = {'date': d}
            total = 0
            for idx, mbu in enumerate(fuel_mbu_headers):
                if 2 + idx < len(r) and r[2 + idx] is not None:
                    val = safe_float(r[2 + idx], 0)
                    entry[mbu] = val
                    total += val
            entry['total'] = total
            fuel_mbu_daily.append(entry)

    # 8c. Vehicle Wise Fuel Detail
    ws = wb_fuel['Vehicle Wise Fuel Detail']
    vehicle_rows = list(ws.iter_rows(values_only=True))
    v_dates = [clean_val(c) for c in vehicle_rows[2][5:] if c is not None]
    vehicles = []
    for r in vehicle_rows[3:]:
        if not r[1]: continue
        v_daily = {}
        v_total = 0
        for idx, d in enumerate(v_dates):
            if 5 + idx < len(r) and r[5 + idx] is not None:
                val = safe_float(r[5 + idx], 0)
                v_daily[d] = val
                v_total += val
        vehicles.append({
            'vehicleNo': str(r[1]).strip(),
            'fsoName': str(r[2]).strip() if r[2] else '',
            'area': str(r[3]).strip() if r[3] else '',
            'mbu': str(r[4]).strip() if r[4] else '',
            'totalFuel': v_total,
            'daily': v_daily
        })

    # 8d. Site DG Profiles
    ws = wb_fuel['Site Detail']
    site_dg_profiles = []
    site_dg_map = {}
    for r in list(ws.iter_rows(values_only=True))[1:]:
        if not r[0]: continue
        code = str(r[0]).strip()
        cf = None
        if len(r) > 9 and r[9] is not None:
            try: cf = float(r[9])
            except: cf = None
        profile = {
            'siteCode': code,
            'siteName': str(r[1]).strip() if len(r) > 1 and r[1] else '',
            'mbu': str(r[2]).strip() if len(r) > 2 and r[2] else '',
            'flmVendor': str(r[3]).strip() if len(r) > 3 and r[3] else '',
            'secVendor': str(r[4]).strip() if len(r) > 4 and r[4] else '',
            'dgKva': str(r[6]).strip() if len(r) > 6 and r[6] is not None else '',
            'engineBrand': str(r[7]).strip() if len(r) > 7 and r[7] else '',
            'dgBrand': str(r[8]).strip() if len(r) > 8 and r[8] else '',
            'consumptionFactor': cf
        }
        site_dg_profiles.append(profile)
        site_dg_map[code] = profile

    # 8e. Site Pouring Logs
    ws = wb_fuel['\u26fdPouring']
    pouring_logs = []
    site_fuel_summary = {}
    for r in list(ws.iter_rows(values_only=True))[2:]:
        if not r[1]: continue
        code = str(r[1]).strip()
        p_date = clean_val(r[8])
        poured = safe_float(r[10])
        bal = safe_float(r[9])
        entry = {
            'siteCode': code,
            'siteName': str(r[2]).strip() if r[2] else '',
            'mbu': str(r[4]).strip() if r[4] else '',
            'vendor': str(r[5]).strip() if r[5] else '',
            'siteStatus': str(r[6]).strip() if r[6] else '',
            'visitNature': str(r[7]).strip() if r[7] else '',
            'date': p_date,
            'fuelBal': bal,
            'fuelPoured': poured,
            'vehicleNo': str(r[19]).strip() if len(r) > 19 and r[19] else '',
            'createdBy': str(r[16]).strip() if len(r) > 16 and r[16] else ''
        }
        pouring_logs.append(entry)
        
        if code not in site_fuel_summary:
            site_fuel_summary[code] = {
                'siteCode': code,
                'siteName': entry['siteName'],
                'mbu': entry['mbu'],
                'totalPoured': 0,
                'visitsCount': 0,
                'lastVisitDate': p_date,
                'lastFuelBal': bal,
                'dgProfile': site_dg_map.get(code, None)
            }
        site_fuel_summary[code]['totalPoured'] += poured
        site_fuel_summary[code]['visitsCount'] += 1

    # Include any DG sites that didn't have pouring activity in site_fuel_summary
    for code, dg in site_dg_map.items():
        if code not in site_fuel_summary:
            site_fuel_summary[code] = {
                'siteCode': code,
                'siteName': dg['siteName'],
                'mbu': dg['mbu'],
                'totalPoured': 0,
                'visitsCount': 0,
                'lastVisitDate': 'N/A',
                'lastFuelBal': 0,
                'dgProfile': dg
            }

    # 8f. Scratching Cards Logs
    ws = wb_fuel['\U0001f4b3Scratching']
    scratching_logs = []
    for r in list(ws.iter_rows(values_only=True))[2:]:
        if not r[1]: continue
        scratching_logs.append({
            'cardCode': str(r[1]).strip(),
            'fuelCompany': str(r[2]).strip() if len(r) > 2 and r[2] else '',
            'vendor': str(r[3]).strip() if len(r) > 3 and r[3] else '',
            'cardName': str(r[4]).strip() if len(r) > 4 and r[4] else '',
            'cardNumber': str(r[5]).strip() if len(r) > 5 and r[5] else '',
            'cardLimit': safe_float(r[6], 0) if len(r) > 6 else 0,
            'mbu': str(r[7]).strip() if len(r) > 7 and r[7] else '',
            'region': str(r[8]).strip() if len(r) > 8 and r[8] else '',
            'date': clean_val(r[9]),
            'quantity': safe_float(r[11], 0) if len(r) > 11 else 0,
            'station': str(r[12]).strip() if len(r) > 12 and r[12] else ''
        })

    wb_fuel.close()

    analytics_data = {
        'dates': active_dates,
        'mbuList': mbu_list,
        'nar': {
            'wholeC4': {
                'deodarDaily': deodar_daily,
                'e2eDaily': e2e_daily,
                'avgDeodar': avg_deodar,
                'avgE2E': avg_e2e,
            },
            'mbuDaily': mbu_daily_nar,
            'mbuDailyDt': mbu_daily_dt,
            'mbuTotals': mbu_totals,
            'elitePlatinum': elite_platinum,
            'outageCategories': outage_categories,
            'sites': sites_nar
        },
        'fuel': {
            'summaryDaily': fuel_summary_daily,
            'totalScratched': sum(x['scratching'] for x in fuel_summary_daily),
            'totalPoured': sum(x['pouring'] for x in fuel_summary_daily),
            'mbuDaily': fuel_mbu_daily,
            'vehicles': vehicles,
            'pouringLogs': pouring_logs,
            'scratchingLogs': scratching_logs,
            'siteDgProfiles': site_dg_profiles,
            'siteFuelList': list(site_fuel_summary.values())
        }
    }

    out_file = r"c:\Users\hamza\OneDrive\Desktop\Engro Connect\src\analyticsData.ts"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write("// @ts-nocheck\nexport const analyticsData = ")
        json.dump(analytics_data, f, separators=(',', ':'))
        f.write(";\n")

    print(f"Analytics Data exported successfully to {out_file} (Size: {os.path.getsize(out_file) / 1024:.1f} KB)")

if __name__ == '__main__':
    parse_all()
