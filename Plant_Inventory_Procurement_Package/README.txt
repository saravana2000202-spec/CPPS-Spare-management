========================================================================================
CAB PANEL PRESS SHOP (CPPS) — PLANT 2003 — MAINTAIN. STORE (NPE1)
OWNER / RESPONSIBLE TEAM: PE Team
SPARE PARTS INVENTORY OPTIMIZATION & PROCUREMENT ACTION PACKAGE
========================================================================================

This package contains the complete inventory analysis, safety stocks, minimum/maximum
levels, reorder points (ROL), reorder quantities (ROQ), and procurement indications for
all 7,340 plant spare parts, calculated from 32 months of SAP consumption history.

----------------------------------------------------------------------------------------
FOLDER CONTENTS:
----------------------------------------------------------------------------------------

1. Interactive_Inventory_Dashboard.html  [STANDALONE OFFLINE DASHBOARD]
   - Double-click to open in Google Chrome, Microsoft Edge, or any web browser!
   - 100% OFFLINE: Requires NO web server, NO Node.js, and NO internet connection.
   - Interactive search, 1-click filters (Urgent Indents, Reorder Point Hit, Critical Spares),
     modal inspection for all 7,340 parts, and 1-click CSV export.

2. Plant_Inventory_Master_Analysis.xlsx  [EXCEL WORKBOOK WITH 5 SHEETS]
   - Sheet 1: 01_Summary_KPI (Executive stats, formula breakdown, risk overview)
   - Sheet 2: 02_Urgent_Critical_Indents (668 high-priority critical parts needing indents)
   - Sheet 3: 03_Critical_Spares_Master (The 751 critical spares from plant risk evaluation)
   - Sheet 4: 04_All_7340_Parts_Master (Full plant spares catalog with all assigned metrics)
   - Sheet 5: 05_32Mo_Consumption_Analytics (1,294 parts with NPE1 issue transaction history)

3. 01_Urgent_Procurement_Indents_SAP.csv
   - Ready-to-import CSV for SAP Purchase Requisitions / Indent creation.
   - Contains part numbers, descriptions, required order quantities, and plant urgency.

4. 02_Critical_Spares_Inventory_Levels.csv
   - Isolated list of all 751 Critical ('C') Spares with complete inventory parameters.

5. 03_All_7340_Parts_Inventory_Master.csv
   - Complete inventory master dataset for all 7,340 parts in Plant 2003.

6. 04_NPE1_32Month_Consumption_Summary.csv
   - Full 32-month issue history (total consumed, monthly average, monthly peak).

7. 01_Open_Interactive_Dashboard.bat
   - Double-click this batch file to immediately launch the dashboard in your default browser.

8. 02_Open_Excel_Workbook.bat
   - Double-click this batch file to immediately open the Excel analysis in Microsoft Excel.

----------------------------------------------------------------------------------------
INVENTORY OPTIMIZATION FORMULAS IMPLEMENTED:
----------------------------------------------------------------------------------------

1. Safety Stock (Buffer Stock):
   Safety Stock = (Max Monthly Usage * LT Months) - (Avg Monthly Usage * LT Months)
   * Lead Time Floor Rules for Insurance/Strategic Spares:
     - Lead time > 3 months or Vital Impact: 4 to 5 units
     - Lead time 2 to 3 months: 3 units
     - Lead time 1 to 2 months: 2 units
     - Lead time < 1 month: 1 unit

2. Minimum Stock:
   Minimum Stock = Safety Stock
   (Stock dropping below this level incurs immediate line-stoppage risk)

3. Reorder Level (ROL / ROP):
   Reorder Level = (Avg Monthly Usage * LT Months) + Safety Stock
   (Automatic trigger point to raise a purchase indent)

4. Reorder Quantity (ROQ):
   ROQ = Max( Ceil(3 * Avg Monthly Usage), Replenishment Floor (2 for Critical, 1 for Normal) )
   (Standard economic batch replenishment quantity)

5. Maximum Stock:
   Maximum Stock = Minimum Stock + ROQ
   (Upper storage ceiling to avoid excess capital lockup)

----------------------------------------------------------------------------------------
PROCUREMENT STATUS TRIGGERS:
----------------------------------------------------------------------------------------
- CRITICAL_STOCKOUT : Current Stock < Safety Stock (or 0 On-Hand).
                      Action: Raise urgent Purchase Requisition immediately!
- REORDER_TRIGGERED : Safety Stock <= Current Stock <= Reorder Level.
                      Action: Stock has reached reorder point. Procure ROQ.
- HEALTHY           : Reorder Level < Current Stock <= Max Stock.
                      Action: Optimal inventory level. No purchasing required.
- OVERSTOCK         : Current Stock > Max Stock.
                      Action: Surplus inventory. Defer orders to release working capital.

----------------------------------------------------------------------------------------
PLANT SUMMARY STATS — CAB PANEL PRESS SHOP (CPPS) — PLANT 2003 (NPE1) | Owner: PE Team
----------------------------------------------------------------------------------------
- Total Spare Parts Evaluated        : 7,340
- Plant-Assessed Critical Spares     : 751
- Active Consumed Spares (32 Months) : 1,294 (6,658 SAP issue transactions)
- Immediate Critical Indents Needed  : 668 parts (658 stockouts + 10 reorder triggers)
- Overstocked Parts                  : 785 parts
- Optimal Healthy Stock Parts        : 178 parts
========================================================================================
