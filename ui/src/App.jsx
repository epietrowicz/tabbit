import { Route, Routes } from "react-router-dom";
import Layout from "./layouts/Layout.jsx";
import ReceiptDetailPage from "./pages/ReceiptDetailPage.jsx";
import ReceiptUploadPage from "./pages/ReceiptUploadPage.jsx";
import "./App.css";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<ReceiptUploadPage />} />
        <Route path="receipts/:id" element={<ReceiptDetailPage />} />
      </Route>
    </Routes>
  );
}
