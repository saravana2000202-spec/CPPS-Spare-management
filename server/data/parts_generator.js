// server/data/parts_generator.js - Deterministic generator for 7,000+ realistic plant part numbers
const fs = require('fs');
const path = require('path');

const CATEGORIES = [
  {
    name: 'Electrical & Automation',
    code: 'ELEC',
    suppliers: [
      { name: 'Siemens Automation', source: 'Imported (Germany)' },
      { name: 'Schneider Electric', source: 'Imported (France)' },
      { name: 'Omron Electronics', source: 'Imported (Japan)' },
      { name: 'ABB Power & Drives', source: 'Imported (Sweden)' },
      { name: 'Delta Electronics', source: 'Domestic Regional' },
      { name: 'L&T Electricals', source: 'Domestic Regional' }
    ],
    items: [
      { name: 'Safety PLC CPU Module 1500F', impact: 'Vital', minLt: 75, maxLt: 180, minQty: 0, maxQty: 2, isStrategic: true },
      { name: 'Variable Frequency Drive 45kW Inverter', impact: 'Vital', minLt: 60, maxLt: 120, minQty: 1, maxQty: 4, isStrategic: true },
      { name: 'Absolute Optical Rotary Encoder 1024 PPR', impact: 'Vital', minLt: 45, maxLt: 90, minQty: 2, maxQty: 8 },
      { name: 'Photoelectric Proximity Sensor M18 PNP', impact: 'Essential', minLt: 10, maxLt: 30, minQty: 25, maxQty: 120 },
      { name: 'Industrial Solid State Relay 40A 24VDC', impact: 'Essential', minLt: 14, maxLt: 40, minQty: 15, maxQty: 80 },
      { name: 'Servo Motor Drive Amplifier 5.5kW', impact: 'Vital', minLt: 70, maxLt: 140, minQty: 1, maxQty: 5, isStrategic: true },
      { name: 'Miniature Circuit Breaker 16A 3-Pole', impact: 'Essential', minLt: 5, maxLt: 20, minQty: 40, maxQty: 200 },
      { name: 'HMI Touch Panel Display 10.4 inch', impact: 'Vital', minLt: 50, maxLt: 110, minQty: 1, maxQty: 6 },
      { name: 'Signal Isolator & Transmitter 4-20mA', impact: 'Desirable', minLt: 10, maxLt: 25, minQty: 10, maxQty: 50 },
      { name: 'Terminal Block 2.5mm DIN Rail', impact: 'Desirable', minLt: 2, maxLt: 10, minQty: 500, maxQty: 5000 }
    ]
  },
  {
    name: 'Pneumatics & Hydraulics',
    code: 'HYDR',
    suppliers: [
      { name: 'Festo Pneumatics', source: 'Imported (Germany)' },
      { name: 'SMC Corporation', source: 'Domestic Regional' },
      { name: 'Rexroth Bosch Hydraulic', source: 'Imported (Germany)' },
      { name: 'Parker Hannifin Corp', source: 'Imported (USA)' },
      { name: 'Janatics Pneumatics', source: 'Local Vendor' },
      { name: 'Yuken Hydraulics', source: 'Domestic Regional' }
    ],
    items: [
      { name: 'Proportional Directional Control Valve 24V', impact: 'Vital', minLt: 80, maxLt: 150, minQty: 1, maxQty: 3, isStrategic: true },
      { name: 'High Pressure Hydraulic Piston Pump 350 Bar', impact: 'Vital', minLt: 90, maxLt: 180, minQty: 0, maxQty: 2, isStrategic: true },
      { name: 'Double Acting Pneumatic Cylinder 63x200mm', impact: 'Essential', minLt: 15, maxLt: 45, minQty: 10, maxQty: 40 },
      { name: 'Solenoid Valve Manifold 5/2 Way 24VDC', impact: 'Essential', minLt: 20, maxLt: 60, minQty: 8, maxQty: 35 },
      { name: 'Hydraulic High Pressure Hose Assembly 3/4 inch', impact: 'Essential', minLt: 7, maxLt: 25, minQty: 30, maxQty: 150 },
      { name: 'FRL Air Filter Regulator Unit 1/2 inch', impact: 'Desirable', minLt: 5, maxLt: 20, minQty: 20, maxQty: 90 },
      { name: 'Nitrile Hydraulic Cylinder Seal Kit D80', impact: 'Essential', minLt: 10, maxLt: 30, minQty: 25, maxQty: 110 },
      { name: 'Pneumatic Quick Push-in Fitting 8mm', impact: 'Desirable', minLt: 2, maxLt: 8, minQty: 200, maxQty: 2000 },
      { name: 'Pressure Relief Safety Valve 250 Bar', impact: 'Vital', minLt: 45, maxLt: 90, minQty: 2, maxQty: 10 },
      { name: 'Digital Pressure Sensor Switch IO-Link', impact: 'Essential', minLt: 25, maxLt: 60, minQty: 12, maxQty: 45 }
    ]
  },
  {
    name: 'Mechanical & Power Transmission',
    code: 'MECH',
    suppliers: [
      { name: 'SKF Bearings', source: 'Imported (Sweden)' },
      { name: 'TIMKEN Roller Bearings', source: 'Imported (USA)' },
      { name: 'Fenner Power Transmission', source: 'Domestic Regional' },
      { name: 'SEW-Eurodrive Geared Motors', source: 'Imported (Germany)' },
      { name: 'Gates Industrial Belts', source: 'Domestic Regional' },
      { name: 'Local Precision Machine Works', source: 'Local Vendor' }
    ],
    items: [
      { name: 'Helical Planetary Gearbox Reduction Unit 50:1', impact: 'Vital', minLt: 90, maxLt: 210, minQty: 0, maxQty: 2, isStrategic: true },
      { name: 'High Speed Spindle Angular Contact Bearing Set', impact: 'Vital', minLt: 65, maxLt: 130, minQty: 1, maxQty: 4, isStrategic: true },
      { name: 'Deep Groove Ball Bearing 6310-2RS', impact: 'Essential', minLt: 5, maxLt: 18, minQty: 40, maxQty: 220 },
      { name: 'Flexible Jaw Shaft Coupling Spider 110mm', impact: 'Essential', minLt: 12, maxLt: 35, minQty: 15, maxQty: 60 },
      { name: 'Timing Synchronous Belt 8M Pitch 50mm Width', impact: 'Essential', minLt: 10, maxLt: 30, minQty: 25, maxQty: 140 },
      { name: 'Linear Motion Guide Block & Rail Carriage HGW35', impact: 'Vital', minLt: 40, maxLt: 85, minQty: 4, maxQty: 16 },
      { name: 'Precision Ground Ball Screw Assembly 40x10', impact: 'Vital', minLt: 75, maxLt: 150, minQty: 1, maxQty: 3, isStrategic: true },
      { name: 'Industrial V-Belt Set B-72 Matching Pair', impact: 'Desirable', minLt: 3, maxLt: 12, minQty: 50, maxQty: 300 },
      { name: 'Split Taper Bushing 45mm Bore', impact: 'Desirable', minLt: 5, maxLt: 15, minQty: 20, maxQty: 80 },
      { name: 'Heavy Duty Pillow Block Bearing UCP212', impact: 'Essential', minLt: 8, maxLt: 25, minQty: 15, maxQty: 75 }
    ]
  },
  {
    name: 'Pumps & Fluid Handling',
    code: 'PUMP',
    suppliers: [
      { name: 'Grundfos Industrial Pumps', source: 'Imported (Denmark)' },
      { name: 'Kirloskar Brothers Ltd', source: 'Domestic Regional' },
      { name: 'KSB Pumps & Valves', source: 'Domestic Regional' },
      { name: 'Flowserve Mechanical Seals', source: 'Imported (USA)' },
      { name: 'EagleBurgmann Seals', source: 'Imported (Germany)' }
    ],
    items: [
      { name: 'Cartridge Mechanical Seal Tungsten Carbide Face', impact: 'Vital', minLt: 60, maxLt: 120, minQty: 2, maxQty: 6, isStrategic: true },
      { name: 'Multi-Stage Centrifugal Feed Water Pump Impeller', impact: 'Vital', minLt: 70, maxLt: 150, minQty: 1, maxQty: 4, isStrategic: true },
      { name: 'Diaphragm Dosing Chemical Metering Pump', impact: 'Vital', minLt: 50, maxLt: 100, minQty: 2, maxQty: 8 },
      { name: 'Viton Chemical Resistant O-Ring Set', impact: 'Essential', minLt: 7, maxLt: 20, minQty: 60, maxQty: 350 },
      { name: 'Stainless Steel Y-Strainer Filter 2 inch', impact: 'Desirable', minLt: 5, maxLt: 15, minQty: 10, maxQty: 40 },
      { name: 'PTFE Flange Gasket 150# ANSI 3 inch', impact: 'Essential', minLt: 4, maxLt: 14, minQty: 100, maxQty: 600 }
    ]
  },
  {
    name: 'Fasteners & Hardware',
    code: 'FAST',
    suppliers: [
      { name: 'Unbrako Fasteners', source: 'Domestic Regional' },
      { name: 'TVS Industrial Fasteners', source: 'Domestic Regional' },
      { name: 'Local Hardware & Bolt Supply', source: 'Local Vendor' }
    ],
    items: [
      { name: 'Hex Socket Head Cap Screw M12x45 Grade 10.9', impact: 'Desirable', minLt: 2, maxLt: 7, minQty: 1000, maxQty: 8000 },
      { name: 'High Tensile Hex Bolt M16x70 Grade 8.8 Galvanized', impact: 'Desirable', minLt: 2, maxLt: 8, minQty: 800, maxQty: 6000 },
      { name: 'Nyloc Self-Locking Nut M10 Zinc Plated', impact: 'Desirable', minLt: 2, maxLt: 6, minQty: 1500, maxQty: 10000 },
      { name: 'Spring Lock Washer M12 DIN 127', impact: 'Desirable', minLt: 1, maxLt: 5, minQty: 2000, maxQty: 15000 },
      { name: 'Dowel Pin Hardened Steel 8x30mm m6 tolerance', impact: 'Essential', minLt: 5, maxLt: 18, minQty: 100, maxQty: 800 }
    ]
  }
];

const STATIONS = [
  'Stamping Line 1 (Main Press)',
  'Robotic Welding Cell B',
  'CNC Machining Center 04',
  'Automated Paint Shop Line',
  'Final Assembly Conveyor A',
  'High-Speed Packaging Bay',
  'Boiler & Steam Utility Substation',
  'Wastewater Treatment Plant',
  'Sheet Metal Laser Cutting Line',
  'Warehouse Overhead Crane'
];

// Seeded pseudorandom generator for deterministic repeatability
function createSeededRandom(seed = 123456789) {
  let s = seed;
  return function() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generatePlantParts(totalCount = 7250) {
  const rand = createSeededRandom(42);
  const parts = [];

  for (let i = 1; i <= totalCount; i++) {
    const partNum = `PRT-${String(i).padStart(5, '0')}`;
    
    // Pick category with weighted probability:
    // Fasteners ~25%, Mechanical ~25%, Electrical ~25%, Pneumatics ~15%, Pumps ~10%
    const catRoll = rand();
    let catIndex = 0;
    if (catRoll < 0.25) catIndex = 4; // Fasteners
    else if (catRoll < 0.50) catIndex = 2; // Mechanical
    else if (catRoll < 0.75) catIndex = 0; // Electrical
    else if (catRoll < 0.90) catIndex = 1; // Pneumatics
    else catIndex = 3; // Pumps

    const cat = CATEGORIES[catIndex];
    const itemTemplate = cat.items[Math.floor(rand() * cat.items.length)];
    const supplierObj = cat.suppliers[Math.floor(rand() * cat.suppliers.length)];
    const station = STATIONS[Math.floor(rand() * STATIONS.length)];

    // Variation suffix for realistic SKU diversity
    const specCodes = ['A1', 'B2', 'HD', 'XP', 'V2', 'PRO', 'SS', 'HT', 'STD', 'M1', 'E4'];
    const spec = specCodes[Math.floor(rand() * specCodes.length)];
    const description = `${itemTemplate.name} [Type ${spec}]`;

    // Determine Lead Time
    let leadTime = Math.floor(itemTemplate.minLt + rand() * (itemTemplate.maxLt - itemTemplate.minLt + 1));
    
    // Determine Annual Quantity
    let qty = Math.floor(itemTemplate.minQty + rand() * (itemTemplate.maxQty - itemTemplate.minQty + 1));

    // Determine Impact
    let impact = itemTemplate.impact;
    // Inject ~5% random variation for field realism
    if (rand() < 0.05) {
      impact = impact === 'Vital' ? 'Essential' : impact === 'Essential' ? 'Vital' : 'Essential';
    }

    // Intentional edge cases for data quality audit:
    let missingField = null;
    if (i % 720 === 0) {
      leadTime = null;
      missingField = 'Lead Time missing';
    } else if (i % 950 === 0) {
      impact = 'Unknown';
      missingField = 'Criticality unassigned';
    }

    const isStrategic = (impact === 'Vital' && leadTime > 60 && qty <= 3);

    parts.push({
      partNumber: partNum,
      description,
      category: cat.name,
      equipmentStation: station,
      supplier: supplierObj.name,
      sourceType: supplierObj.source,
      leadTimeDays: leadTime,
      annualQtyUsed: qty,
      downtimeImpactLevel: impact,
      unitCostUSD: Math.round(15 + rand() * 4500),
      isStrategicFlag: isStrategic,
      dataQualityNote: missingField
    });
  }

  return parts;
}

module.exports = {
  generatePlantParts
};
