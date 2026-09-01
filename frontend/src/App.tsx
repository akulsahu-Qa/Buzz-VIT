import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PatientRoundingTracker } from "./workflows/manager/patient-round/PatientRoundingTracker";
import { PatientRoundForm } from "./workflows/manager/patient-round/PatientRoundForm";
import { ChecklistRoute } from "./workflows/core/ChecklistRoute";
import { TaskRoute } from "./workflows/core/TaskRoute";
import { AdminSimulator } from "./workflows/admin/AdminSimulator";
import "./index.css";



export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* V2 Generic Task Route */}
        <Route path="/task" element={<TaskRoute />} />

        {/* Main checklist route — works for ALL workflow types */}
        <Route path="/checklist" element={<ChecklistRoute />} />

        {/* Patient Rounding Routes */}
        <Route path="/rounds" element={<PatientRoundingTracker />} />
        <Route path="/rounds/:id" element={<PatientRoundForm />} />

        {/* Admin Simulator */}
        <Route path="/admin" element={<AdminSimulator />} />

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
