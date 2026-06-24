"use client";

import dynamic from "next/dynamic";

// Leaflet needs the browser — load the map only on the client (no SSR).
const AdminMap = dynamic(() => import("./AdminMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[420px] place-items-center rounded-lg border border-gray-200 text-gray-400">
      Loading map…
    </div>
  ),
});

export default function AdminMapClient(props) {
  return <AdminMap {...props} />;
}
