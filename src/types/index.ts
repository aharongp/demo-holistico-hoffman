@@ .. @@
 export interface EvolutionEntry {
   id: string;
   patientId: string;
   date: string;
   mood: number;
   energy: number;
   notes: string;
+  weight?: number;
+  bloodSugar?: number;
+  bloodPressureSystolic?: number;
+  bloodPressureDiastolic?: number;
+  pulse?: number;
+  bmi?: number;
+  waistMeasurement?: number;
+  chestMeasurement?: number;
+  hipMeasurement?: number;
+  heartRate?: number;
 }