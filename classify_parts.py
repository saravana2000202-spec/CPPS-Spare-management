"""
classify_parts.py
Plant Spare Parts Criticality Analyzer & Separator (7,000+ Parts)
Uses: Lead Time (SDE), Annual Production Quantity, and Operational Impact (VED)
Works standalone with Python Standard Library (no external pip dependencies needed)
and enhances with pandas/openpyxl if available.
"""

import sys
import os
import csv
import re
import math

def run_classification_stdlib(input_file="plant_parts_master_sample.csv", output_file="classified_critical_parts_only.csv"):
    print("=" * 65)
    print("  PLANT PARTS CRITICALITY ANALYZER & SEPARATOR (7,000+ Parts)")
    print("  Running with Python Standard Library (zero-dependency)")
    print("=" * 65)

    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' not found.")
        print("Please place your CSV file in this folder and try again.")
        return

    print(f"Loading '{input_file}'...")
    with open(input_file, mode="r", encoding="utf-8-sig", errors="replace") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    total_rows = len(rows)
    print(f"Successfully loaded {total_rows:,} parts. Processing multi-criteria model...\n")

    # Helper: extract digits
    def parse_number(val, default=0.0):
        if not val:
            return default
        m = re.search(r"(\d+(\.\d+)?)", str(val))
        return float(m.group(1)) if m else default

    # Pre-parse quantities to find percentiles (50th and 80th)
    quantities = []
    for r in rows:
        q = parse_number(r.get("Annual_Qty_Used") or r.get("Quantity") or 0)
        quantities.append(q)
    quantities.sort()

    n = len(quantities)
    p50 = quantities[int(n * 0.50)] if n > 0 else 100
    p80 = quantities[int(n * 0.80)] if n > 0 else 500

    classified_records = []
    critical_records = []
    strategic_count = 0

    for r in rows:
        part_num = r.get("Part_Number") or r.get("PartNumber") or "UNKNOWN"
        desc = r.get("Description") or ""
        category = r.get("Category") or ""
        station = r.get("Equipment_Station") or r.get("Station") or ""
        supplier = r.get("Supplier") or ""
        source = r.get("Source_Type") or "Domestic"

        lt_days = parse_number(r.get("Lead_Time_Days") or r.get("Lead Time"))
        qty_used = parse_number(r.get("Annual_Qty_Used") or r.get("Quantity"))
        impact_raw = (r.get("Downtime_Impact_Level") or r.get("Criticality") or "").strip().upper()

        # 1. Lead Time Score (SDE): Weight 35%
        # >60 days = 3, 15-60 days = 2, <15 days = 1
        if lt_days > 60:
            lt_score = 3
        elif lt_days >= 15:
            lt_score = 2
        else:
            lt_score = 1

        # 2. Downtime Impact Score (VED): Weight 45%
        # Vital = 3, Essential = 2, Desirable = 1
        if any(w in impact_raw for w in ["VITAL", "STOP", "CRITICAL", "HIGH", "3"]):
            impact_score = 3
        elif any(w in impact_raw for w in ["ESSENTIAL", "MEDIUM", "WARN", "2"]):
            impact_score = 2
        else:
            impact_score = 1

        # 3. Usage Score: Weight 20%
        if qty_used >= p80:
            usage_score = 3
        elif qty_used >= p50:
            usage_score = 2
        else:
            usage_score = 1

        # 4. Composite Criticality Index
        composite_score = round(
            (0.45 * impact_score) + (0.35 * lt_score) + (0.20 * usage_score), 2
        )

        # 5. Strategic Spare Override Rule: Vital (3) AND Long Lead Time (3)
        is_strategic = (impact_score == 3 and lt_score == 3)
        if is_strategic:
            strategic_count += 1
            classification = "CRITICAL (Strategic Spare)"
            category_tag = "CRITICAL"
        elif composite_score >= 2.30:
            classification = "CRITICAL"
            category_tag = "CRITICAL"
        elif composite_score >= 1.70:
            classification = "SEMI-CRITICAL"
            category_tag = "SEMI-CRITICAL"
        else:
            classification = "NON-CRITICAL"
            category_tag = "NON-CRITICAL"

        # Justification
        reasons = []
        if impact_score == 3: reasons.append("Vital line stoppage risk")
        if lt_score == 3: reasons.append(f"Long lead time ({int(lt_days)}d)")
        if usage_score == 3: reasons.append("Top 20% high usage volume")
        if is_strategic: reasons.append("Strategic capital insurance spare")
        justification = "; ".join(reasons) if reasons else "Standard operational replenishment"

        rec = {
            "Part_Number": part_num,
            "Description": desc,
            "Category": category,
            "Equipment_Station": station,
            "Supplier": supplier,
            "Source_Type": source,
            "Lead_Time_Days": int(lt_days),
            "Lead_Time_Score": lt_score,
            "Annual_Qty_Used": int(qty_used),
            "Usage_Score": usage_score,
            "Downtime_Impact": impact_raw,
            "Impact_Score": impact_score,
            "Composite_Criticality_Score": composite_score,
            "Classification": classification,
            "Category_Tag": category_tag,
            "Strategic_Spare_Override": "YES" if is_strategic else "NO",
            "Justification": justification
        }

        classified_records.append(rec)
        if category_tag == "CRITICAL":
            critical_records.append(rec)

    # Sort Critical by Composite Score desc, then Lead Time desc
    critical_records.sort(
        key=lambda x: (x["Composite_Criticality_Score"], x["Lead_Time_Days"]),
        reverse=True
    )

    # Summary
    total_crit = len(critical_records)
    total_semi = sum(1 for r in classified_records if r["Category_Tag"] == "SEMI-CRITICAL")
    total_non = sum(1 for r in classified_records if r["Category_Tag"] == "NON-CRITICAL")

    print("CLASSIFICATION SUMMARY:")
    print("-" * 55)
    print(f"Total Parts Analyzed    : {total_rows:>6,}")
    print(f"CRITICAL Parts Isolated : {total_crit:>6,} ({total_crit/total_rows*100:>5.1f}%) [Action Required]")
    print(f"  |-- Strategic Spares  : {strategic_count:>6,} (Vital + Lead Time > 60d)")
    print(f"SEMI-CRITICAL Parts     : {total_semi:>6,} ({total_semi/total_rows*100:>5.1f}%) [ROP Min/Max]")
    print(f"NON-CRITICAL Parts      : {total_non:>6,} ({total_non/total_rows*100:>5.1f}%) [JIT / VMI]")
    print("-" * 55)

    # Write Critical Parts Only CSV
    fieldnames = list(classified_records[0].keys())
    with open(output_file, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(critical_records)

    all_output_file = "classified_all_parts.csv"
    with open(all_output_file, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(classified_records)

    print(f"\nSUCCESS:")
    print(f"  -> Critical Parts separated to: '{output_file}' ({total_crit:,} items)")
    print(f"  -> All Categorized parts saved to: '{all_output_file}' ({total_rows:,} items)")

if __name__ == "__main__":
    input_csv = sys.argv[1] if len(sys.argv) > 1 else "plant_parts_master_sample.csv"
    run_classification_stdlib(input_file=input_csv)
