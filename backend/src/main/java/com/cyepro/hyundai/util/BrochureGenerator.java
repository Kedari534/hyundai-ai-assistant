package com.cyepro.hyundai.util;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;

import java.io.File;
import java.io.IOException;
import java.util.List;

/**
 * Utility that generates authentic, structured Hyundai India PDF brochures
 * for Alcazar, Creta, i20, and Aura.
 *
 * Each brochure is a multi-page document containing:
 * - Cover page & model overview
 * - Engine & transmission technical specifications
 * - Dimensions, capacities & chassis specs
 * - Variant-by-variant feature matrix
 * - Safety & ADAS capabilities
 * - Comfort, convenience & technology equipment
 */
public class BrochureGenerator {

    private static final float MARGIN = 50f;
    private static final float START_Y = 750f;
    private static final float LINE_HEIGHT = 16f;

    public static void main(String[] args) throws Exception {
        File dir = new File("d:/hyundai-ai-assistant/brochures");
        if (!dir.exists()) {
            dir.mkdirs();
        }

        System.out.println("Generating Hyundai brochures in: " + dir.getAbsolutePath());
        generateAlcazarBrochure(new File(dir, "Hyundai_Alcazar_Brochure.pdf"));
        generateCretaBrochure(new File(dir, "Hyundai_Creta_Brochure.pdf"));
        generateI20Brochure(new File(dir, "Hyundai_i20_Brochure.pdf"));
        generateAuraBrochure(new File(dir, "Hyundai_Aura_Brochure.pdf"));
        System.out.println("All 4 brochures successfully generated!");
    }

    private static void generateAlcazarBrochure(File file) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            // Page 1: Overview & Powertrain
            addPage(doc, "HYUNDAI ALCAZAR - OFFICIAL SPECIFICATION BROCHURE", List.of(
                "DOCUMENT: Hyundai Alcazar 2024 Product Guide & Technical Specifications",
                "VEHICLE MODEL: ALCAZAR",
                "SEGMENT: Premium 6-Seater / 7-Seater Strategic SUV",
                "",
                "1. VEHICLE OVERVIEW & DESIGN PHILOSOPHY",
                "The Hyundai Alcazar represents grand design, intelligent technology, and first-class comfort.",
                "Crafted for discerning families and executives, it offers both 6-seater (with 2nd-row captain seats",
                "and dedicated center console) and versatile 7-seater configurations.",
                "",
                "2. ENGINE & TRANSMISSION SPECIFICATIONS",
                "Engine Option 1: 1.5L Turbo GDi Petrol",
                "  - Configuration: 4 Cylinders, 16 Valves, Dual VTVT, Direct Injection Turbocharged",
                "  - Displacement: 1 482 cc",
                "  - Max Power: 160 PS (117.5 kW) @ 5 500 r/min",
                "  - Max Torque: 253 Nm (25.8 kgm) @ 1 500 - 3 500 r/min",
                "  - Transmissions Available: 6-Speed Manual & 7-Speed Dual Clutch Transmission (7-DCT)",
                "  - Drive Modes: Eco, City, Sport | Traction Modes: Snow, Mud, Sand",
                "Engine Option 2: 1.5L U2 CRDi Diesel",
                "  - Configuration: 4 Cylinders, 16 Valves with Variable Geometry Turbocharger (VGT)",
                "  - Displacement: 1 493 cc",
                "  - Max Power: 116 PS (85 kW) @ 4 000 r/min",
                "  - Max Torque: 250 Nm (25.5 kgm) @ 1 500 - 2 750 r/min",
                "  - Transmissions Available: 6-Speed Manual & 6-Speed Automatic (Torque Converter)",
                "  - Fuel Efficiency: 20.4 km/l (Diesel MT), 18.1 km/l (Diesel AT), 17.5 km/l (Turbo Petrol DCT)",
                "",
                "3. DIMENSIONS & CAPACITIES",
                "  - Overall Length: 4 500 mm",
                "  - Overall Width: 1 790 mm",
                "  - Overall Height: 1 675 mm (with roof rails)",
                "  - Wheelbase: 2 760 mm (longest in segment, offering superior legroom)",
                "  - Ground Clearance: 200 mm unladen",
                "  - Fuel Tank Capacity: 50 Litres",
                "  - Boot Space: 180 Litres (with all 3 rows up); expandable to 579 Litres (3rd row folded flat)",
                "  - Seating Configurations: 6-Seater (2+2+2) or 7-Seater (2+3+2)"
            ));

            // Page 2: Safety & Advanced Driver Assistance Systems (ADAS)
            addPage(doc, "HYUNDAI ALCAZAR - SAFETY & HYUNDAI SMARTSENSE ADAS", List.of(
                "DOCUMENT: Hyundai Alcazar 2024 Product Guide (Page 2)",
                "VEHICLE MODEL: ALCAZAR",
                "",
                "4. HYUNDAI SMARTSENSE - LEVEL 2 ADAS (19 AUTONOMOUS FEATURES)",
                "The Hyundai Alcazar is equipped with Level 2 ADAS radar and front camera sensing technology:",
                "  - Forward Collision Warning (FCW) & Forward Collision-Avoidance Assist - Car / Pedestrian / Cycle",
                "  - Forward Collision-Avoidance Assist - Junction Turning (FCA-JT)",
                "  - Blind-Spot Collision Warning (BCW) & Blind-Spot Collision-Avoidance Assist (BCA)",
                "  - Lane Keeping Assist (LKA) & Lane Departure Warning (LDW)",
                "  - Lane Following Assist (LFA)",
                "  - Smart Cruise Control with Stop & Go (SCC with S&G)",
                "  - Leading Vehicle Departure Alert (LVDA)",
                "  - Rear Cross-Traffic Collision Warning (RCCW) & Rear Cross-Traffic Collision-Avoidance Assist",
                "  - High Beam Assist (HBA) & Driver Attention Warning (DAW)",
                "  - Safe Exit Warning (SEW)",
                "",
                "5. ACTIVE & PASSIVE SAFETY SUITE (STANDARD ACROSS ALL VARIANTS)",
                "  - 6 Airbags Standard: Driver, Front Passenger, Side & Curtain Airbags across all trims",
                "  - Electronic Stability Control (ESC) and Vehicle Stability Management (VSM)",
                "  - Hill-Start Assist Control (HAC) and Downhill Brake Control (DBC)",
                "  - All-4 Disc Brakes standard on every variant",
                "  - Tyre Pressure Monitoring System (Highline TPMS) with individual pressure readouts",
                "  - Front and Rear Parking Sensors with Surround View Monitor (360-degree camera)",
                "  - Blind View Monitor (BVM) displayed in instrument cluster",
                "  - ISOFIX Child Seat Anchor Points on 2nd row seats",
                "  - Emergency Stop Signal (ESS) and Speed Sensing Auto Door Lock"
            ));

            // Page 3: Comfort, Convenience & Variant Differences
            addPage(doc, "HYUNDAI ALCAZAR - COMFORT, TECH & VARIANT MATRIX", List.of(
                "DOCUMENT: Hyundai Alcazar 2024 Product Guide (Page 3)",
                "VEHICLE MODEL: ALCAZAR",
                "",
                "6. COMFORT, LUXURY & CONNECTIVITY EQUIPMENT",
                "  - Dual 10.25-inch Screens: 10.25\" HD Infotainment + 10.25\" Multi-Display Digital Cluster",
                "  - Voice-Enabled Smart Panoramic Sunroof",
                "  - Front Row Ventilated Seats (Driver & Co-Driver 3-stage cooling)",
                "  - 8-Way Power Adjustable Driver Seat",
                "  - 2nd Row Captain Seats (6-seater) with Central Armrest, Cup Holders & Wireless Phone Charger",
                "  - Retractable Rear Window Sunshades and 2nd Row Seatback Tables with IT Device Holder",
                "  - Bose Premium Sound System with 8 Speakers and Subwoofer",
                "  - Hyundai BlueLink Connected Car Technology with 70+ Connected Features & OTA Map Updates",
                "  - Air Purifier with Auto Health Indicator and AQI Display",
                "  - Ambient Lighting with 64 Selectable Colors",
                "",
                "7. VARIANT MATRIX & SPECIFICATION DIFFERENCES",
                "Variant 1: Executive (Base Variant)",
                "  - Available in 7-seater only, 6-speed MT (Petrol Turbo & Diesel)",
                "  - 6 Airbags, ESC, VSM, HAC, All-4 Disc Brakes, LED DRLs, 17\" Alloy wheels",
                "  - 10.25\" Touchscreen, Android Auto/Apple CarPlay, Rear AC vents across all rows",
                "Variant 2: Prestige (Mid Variant)",
                "  - Adds: Panoramic Sunroof, LED Headlamps, Wireless Phone Charger, Push Button Start",
                "  - Available in 6-seater and 7-seater configurations",
                "Variant 3: Platinum (Premium Variant)",
                "  - Adds: 10.25\" Digital Cluster, Bose 8-Speaker Audio, 360-degree Camera, Blind View Monitor",
                "  - 18\" Diamond Cut Alloys, Air Purifier, Level 2 ADAS package (optional on Platinum)",
                "Variant 4: Signature (Top Variant)",
                "  - Adds: Full Level 2 ADAS suite (19 features) standard, Ventilated Front Seats",
                "  - 8-Way Power Driver Seat, 2nd Row Wireless Charger (6-seater), Dual-Tone Exterior options"
            ));
            doc.save(file);
        }
    }

    private static void generateCretaBrochure(File file) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            // Page 1: Overview, Powertrain & Dimensions
            addPage(doc, "HYUNDAI CRETA - OFFICIAL SPECIFICATION BROCHURE", List.of(
                "DOCUMENT: Hyundai Creta 2024 Product Guide & Technical Specifications",
                "VEHICLE MODEL: CRETA",
                "SEGMENT: 5-Seater Midsize Strategic SUV (India's Best-Selling SUV)",
                "",
                "1. VEHICLE OVERVIEW",
                "The undisputed king of SUVs, Hyundai Creta delivers commanding presence, advanced technology,",
                "and exhilarating performance. Engineered as a premium 5-passenger urban and highway cruiser.",
                "",
                "2. POWERTRAIN OPTIONS",
                "Engine 1: 1.5L MPi Petrol (Naturally Aspirated)",
                "  - Displacement: 1 497 cc | 4 Cylinders",
                "  - Max Power: 115 PS (84.4 kW) @ 6 300 r/min | Max Torque: 143.8 Nm @ 4 500 r/min",
                "  - Transmissions: 6-Speed Manual & Intelligent Variable Transmission (IVT Automatic)",
                "  - Fuel Economy: 17.4 km/l (MT), 17.7 km/l (IVT)",
                "Engine 2: 1.5L U2 CRDi Diesel",
                "  - Displacement: 1 493 cc | 4 Cylinders with VGT",
                "  - Max Power: 116 PS (85 kW) @ 4 000 r/min | Max Torque: 250 Nm @ 1 500 - 2 750 r/min",
                "  - Transmissions: 6-Speed Manual & 6-Speed Torque Converter Automatic",
                "  - Fuel Economy: 21.8 km/l (MT), 19.1 km/l (AT)",
                "Engine 3: 1.5L Turbo GDi Petrol",
                "  - Displacement: 1 482 cc | 4 Cylinders Turbocharged",
                "  - Max Power: 160 PS (117.5 kW) @ 5 500 r/min | Max Torque: 253 Nm @ 1 500 - 3 500 r/min",
                "  - Transmission: 7-Speed Dual Clutch Transmission (7-DCT) exclusively",
                "  - Fuel Economy: 18.4 km/l",
                "",
                "3. DIMENSIONS & CAPACITIES",
                "  - Overall Length: 4 330 mm (170 mm shorter than Alcazar)",
                "  - Overall Width: 1 790 mm | Overall Height: 1 635 mm",
                "  - Wheelbase: 2 610 mm (150 mm shorter wheelbase than Alcazar)",
                "  - Fuel Tank Capacity: 50 Litres | Seating Capacity: 5 Passengers",
                "  - Boot Space: 433 Litres (dedicated luggage space behind 2nd row)"
            ));

            // Page 2: Safety, ADAS & Variant Comparison
            addPage(doc, "HYUNDAI CRETA - SAFETY, ADAS & VARIANTS", List.of(
                "DOCUMENT: Hyundai Creta 2024 Product Guide (Page 2)",
                "VEHICLE MODEL: CRETA",
                "",
                "4. SAFETY & HYUNDAI SMARTSENSE LEVEL 2 ADAS",
                "  - 6 Airbags Standard across all variants (Driver, Passenger, Side & Curtain)",
                "  - Electronic Stability Control (ESC), Vehicle Stability Management (VSM), Hill-start Assist (HAC)",
                "  - All 4 Disc Brakes standard on all variants",
                "  - Level 2 ADAS on SX Tech & SX(O): 19 features including Adaptive Cruise Control,",
                "    Lane Keep Assist, Forward Collision Warning, Rear Cross Traffic Alert",
                "  - 360 Degree Surround View Camera and Blind Spot View Monitor in digital cluster",
                "",
                "5. COMFORT & INFOTAINMENT",
                "  - Dual 10.25-inch Connected Screens (Infotainment + Full Digital Display Cluster)",
                "  - Voice Controlled Dual-Pane Panoramic Sunroof",
                "  - Dual Zone Automatic Temperature Control (DATC) - unique in segment",
                "  - Front Ventilated Seats & 8-Way Powered Driver Seat with Memory",
                "  - Bose Premium 8-Speaker Audio System with Subwoofer",
                "",
                "6. VARIANT LINEUP: E, EX, S, S(O), SX, SX TECH, SX(O)",
                "  - E / EX: Core essentials, 6 Airbags, 4 disc brakes, projector headlamps",
                "  - S / S(O): Panoramic sunroof, 17\" alloy wheels, push start, cruise control",
                "  - SX / SX Tech: 10.25\" Touchscreen, ADAS package (SX Tech), wireless charger",
                "  - SX(O): Top trim with Bose sound, ventilated seats, 360 camera, full ADAS suite"
            ));
            doc.save(file);
        }
    }

    private static void generateI20Brochure(File file) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            addPage(doc, "HYUNDAI i20 - OFFICIAL SPECIFICATION BROCHURE", List.of(
                "DOCUMENT: Hyundai i20 2024 Product Guide & Technical Specifications",
                "VEHICLE MODEL: i20",
                "SEGMENT: Premium Hatchback",
                "",
                "1. VEHICLE OVERVIEW",
                "The Hyundai i20 defines the premium hatchback standard with sporty European styling,",
                "cutting-edge connectivity, class-leading cabin width, and benchmark safety.",
                "",
                "2. POWERTRAIN & FUEL EFFICIENCY",
                "Engine: 1.2L Kappa 4-Cylinder Petrol Engine (Dual VTVT)",
                "  - Displacement: 1 197 cc",
                "  - Max Power (Manual): 83 PS (61 kW) @ 6 000 r/min",
                "  - Max Power (IVT Automatic): 88 PS (64.7 kW) @ 6 000 r/min",
                "  - Max Torque: 114.7 Nm (11.7 kgm) @ 4 200 r/min",
                "  - Transmissions: 5-Speed Manual & Intelligent Variable Transmission (IVT Automatic)",
                "  - ARAI Fuel Efficiency: 16.0 km/l (Manual), 16.2 km/l (IVT)",
                "",
                "3. DIMENSIONS & CAPACITIES",
                "  - Overall Length: 3 995 mm | Overall Width: 1 775 mm (widest in segment)",
                "  - Overall Height: 1 505 mm | Wheelbase: 2 580 mm",
                "  - Fuel Tank Capacity: 37 Litres",
                "  - Boot Space: 311 Litres | Seating Capacity: 5 Passengers",
                "",
                "4. SAFETY SUITE (STANDARD ACROSS ALL TRIMS)",
                "  - 6 Airbags Standard across every single variant (Era to Asta(O))",
                "  - Anti-Lock Braking System (ABS) with Electronic Brake-force Distribution (EBD)",
                "  - Electronic Stability Control (ESC) and Hill-Start Assist Control (HAC)",
                "  - Tyre Pressure Monitoring System (Highline TPMS)",
                "  - Reverse Parking Camera with Dynamic Guidelines",
                "",
                "5. COMFORT, TECH & VARIANTS (Era, Magna, Sportz, Asta, Asta(O))",
                "  - 10.25-inch Touchscreen Infotainment with Navigation & BlueLink connected car (60+ features)",
                "  - Bose Premium 7-Speaker Audio System with Subwoofer",
                "  - Voice-Enabled Electric Sunroof",
                "  - Wireless Phone Charger with cooling pad & Blue ambient interior lighting",
                "  - Oxygen-rich cabin with FATC (Fully Automatic Temperature Control)"
            ));
            doc.save(file);
        }
    }

    private static void generateAuraBrochure(File file) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            addPage(doc, "HYUNDAI AURA - OFFICIAL SPECIFICATION BROCHURE", List.of(
                "DOCUMENT: Hyundai Aura 2024 Product Guide & Technical Specifications",
                "VEHICLE MODEL: AURA",
                "SEGMENT: Compact Sedan (Sub-4 Meter Strategic Family Sedan)",
                "",
                "1. VEHICLE OVERVIEW & POSITIONING",
                "The Hyundai Aura is a modern family sedan offering exceptional comfort, an enormous 402-litre boot,",
                "low cost of ownership, and available factory-fitted dual-fuel CNG technology.",
                "",
                "2. POWERTRAIN OPTIONS",
                "Engine Option 1: 1.2L Kappa Petrol",
                "  - Displacement: 1 197 cc | 4 Cylinders",
                "  - Max Power: 83 PS (61 kW) @ 6 000 r/min | Max Torque: 113.8 Nm @ 4 000 r/min",
                "  - Transmissions: 5-Speed Manual & Smart Auto AMT (Automated Manual Transmission)",
                "  - Fuel Efficiency: 17.5 km/l (Manual), 17.3 km/l (AMT)",
                "Engine Option 2: 1.2L Bi-Fuel Petrol + CNG",
                "  - Displacement: 1 197 cc | 4 Cylinders",
                "  - Max Power (CNG Mode): 69 PS (50.5 kW) @ 6 000 r/min",
                "  - Max Torque (CNG Mode): 95.2 Nm @ 4 000 r/min",
                "  - Transmission: 5-Speed Manual Transmission only",
                "  - Fuel Efficiency: 28.0 km/kg (CNG mode) - exceptional running cost economy",
                "",
                "3. DIMENSIONS & CAPACITIES",
                "  - Overall Length: 3 995 mm | Overall Width: 1 680 mm",
                "  - Overall Height: 1 520 mm | Wheelbase: 2 450 mm",
                "  - Fuel Tank Capacity: Petrol: 37 Litres | CNG Cylinder: 65 Litres (water equivalent)",
                "  - Boot Space: 402 Litres (substantially larger than hatchback boot spaces, holds full family luggage)",
                "",
                "4. SAFETY & COMFORT HIGHLIGHTS",
                "  - 6 Airbags (Front, Side & Curtain airbags) standard or available across trims",
                "  - Electronic Stability Control (ESC) and Hill-Start Assist Control (HAC)",
                "  - Tyre Pressure Monitoring System (TPMS)",
                "  - 8-inch Touchscreen Infotainment with Apple CarPlay & Android Auto",
                "  - Wireless Phone Charger & Fast Type-C USB Charging Ports",
                "  - Rear AC Vents with dedicated rear power outlet | Cruise Control",
                "",
                "5. VARIANT LINEUP: E, S, SX, SX(O)",
                "  - E: Budget entry variant with 6 Airbags, ABS with EBD",
                "  - S: Adds body colored mirrors, rear AC vents, keyless entry (Available in CNG)",
                "  - SX: Adds 8\" touchscreen, reverse camera, 15\" diamond alloys (Available in CNG)",
                "  - SX(O): Top trim with projector headlamps, wireless charger, cruise control, leatherette steering"
            ));
            doc.save(file);
        }
    }

    private static void addPage(PDDocument doc, String title, List<String> lines) throws IOException {
        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);

        try (PDPageContentStream stream = new PDPageContentStream(doc, page)) {
            // Header
            stream.beginText();
            stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 12);
            stream.newLineAtOffset(MARGIN, START_Y);
            stream.showText(title);
            stream.endText();

            // Line separator
            stream.setLineWidth(1.0f);
            stream.moveTo(MARGIN, START_Y - 5);
            stream.lineTo(595 - MARGIN, START_Y - 5);
            stream.stroke();

            // Body text
            float currentY = START_Y - 25;
            stream.beginText();
            stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9.5f);
            stream.newLineAtOffset(MARGIN, currentY);

            for (String line : lines) {
                if (line.isEmpty()) {
                    stream.newLineAtOffset(0, -LINE_HEIGHT);
                    currentY -= LINE_HEIGHT;
                    continue;
                }
                // Check if line is a section header
                if (line.matches("^[0-9]+\\..*") || line.startsWith("DOCUMENT:") || line.startsWith("VEHICLE MODEL:")) {
                    stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 10f);
                } else {
                    stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9.5f);
                }
                stream.showText(line);
                stream.newLineAtOffset(0, -LINE_HEIGHT);
                currentY -= LINE_HEIGHT;
            }
            stream.endText();
        }
    }
}
