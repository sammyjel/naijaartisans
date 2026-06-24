"use client";

import dynamic from "next/dynamic";

const LocationMap = dynamic(() => import("./LocationMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[280px] place-items-center bg-gray-50 text-gray-400">Loading map…</div>
  ),
});

export default function LocationMapClient(props) {
  return <LocationMap {...props} />;
}
