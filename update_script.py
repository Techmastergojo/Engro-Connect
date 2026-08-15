import csv
import json
import uuid
import time
import os
from PIL import Image

# 1. Image background removal
def remove_white_bg(img_path, out_path):
    try:
        img = Image.open(img_path)
        img = img.convert("RGBA")
        datas = img.getdata()
        newData = []
        for item in datas:
            # Change all white (also shades of white)
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)
        img.putdata(newData)
        img.save(out_path, "PNG")
        print("Image successfully processed and saved to", out_path)
    except Exception as e:
        print("Error processing image:", e)

img_src = r"c:\Users\hamza\OneDrive\Desktop\Engro Connect\Enfrashare-319x255.png"
img_dest = r"c:\Users\hamza\OneDrive\Desktop\Engro Connect\public\logo.png"
remove_white_bg(img_src, img_dest)

# 2. Parse CSV to defaultData.ts
csv_file = r"c:\Users\hamza\OneDrive\Desktop\Engro Connect\Engro Enfrashare.csv"
out_file = r"c:\Users\hamza\OneDrive\Desktop\Engro Connect\src\defaultData.ts"

sites = []
try:
    with open(csv_file, "r", encoding="windows-1252") as f:
        reader = csv.DictReader(f)
        for row in reader:
            def get(keys, default=""):
                for k in keys:
                    if k in row: return row[k]
                return default
            
            try:
                lat = float(get(["Latitude", "lat"]).replace("..", "."))
                lng = float(get(["Longitude", "lng"]).replace("..", "."))
            except:
                continue
            
            name = get(["Site ID", "name", "Name"])
            if not name: continue

            depSites = get(["Dependent sites", "Dependent site", "dependentSites", "No of Sites", "noOfSites"])
            
            site = {
                "id": str(uuid.uuid4()),
                "name": name,
                "lat": lat,
                "lng": lng,
                "mbuNumber": get(["MBU Number"]),
                "mbuName": get(["MBU Name"]),
                "cellNumber": get(["Cell Number"]),
                "networkPortfolio": get(["Network portofolio", "Network Portfolio"]),
                "zonalManager": get(["Zonal Manager"]),
                "jazzId": get(["Jazz id"]),
                "telenorId": get(["Telenor id"]),
                "zongId": get(["Zong id", "ZONG ID"]),
                "ufoneId": get(["Ufone id", "Ufone ID"]),
                "siteStatus": get(["Site status", "siteStatus"]),
                "category": get(["Category", "category"]),
                "powerStatus": get(["Power status", "powerStatus"]),
                "securityVendor": get(["Security Vendor", "securityVendor"]),
                "guestOmo": get(["Guest OMOs", "Guest OMO", "guestOmo"]),
                "dgShared": get(["DG shared ", "DG shared", "dgShared"]),
                "dcShared": get(["DC shared", "dcShared"]),
                "solar": get(["Solar", "solar"]),
                "dgStatus": get(["DG status", "dgStatus"]),
                "dependentSites": depSites,
                "noOfSites": get(["No of Sites", "noOfSites"]) or depSites,
                "solarKwa": get(["Solar KWA", "solarKwa"]),
                "neLocation": get(["NE location", "neLocation"]),
                "dcSharedWith": get(["DC Shared With", "dcSharedWith"]),
                "tpId": get(["TP ID", "tpId"]),
                "tpApprovedServices": get(["TP Approved Services", "tpApprovedServices"]),
                "zongApprovedServices": get(["Zong Approved Services", "zongApprovedServices"]),
                "ufoneApprovedServices": get(["Ufone Approved Services", "ufoneApprovedServices"]),
                "jazzApprovedServices": get(["Jazz Approved Services", "jazzApprovedServices"]),
                "createdAt": int(time.time() * 1000)
            }
            # Remove empty values to keep JSON small
            site = {k: v for k, v in site.items() if v != "" and v != None}
            sites.append(site)
            
    with open(out_file, "w", encoding="utf-8") as f:
        f.write('// @ts-nocheck\nimport type { Site } from "./types";\n\nexport const defaultSites: Site[] = ')
        json.dump(sites, f, indent=2)
        f.write(";\n")
    print("Data successfully exported. Total sites:", len(sites))
except Exception as e:
    print("Error converting CSV:", e)
