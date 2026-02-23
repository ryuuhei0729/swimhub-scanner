"use client";

import { useState, useCallback } from "react";
import type { ScanTimesheetResponse, SwimmerResult, SwimStroke } from "@swimhub-scanner/shared";
import { averageTime, fastestTime, slowestTime } from "@swimhub-scanner/shared";
import { Button } from "@/components/ui/Button";

interface ResultTableProps {
  data: ScanTimesheetResponse;
  onDataChange: (data: ScanTimesheetResponse) => void;
}

const STROKE_OPTIONS: SwimStroke[] = ["Fr", "Br", "Ba", "Fly", "IM"];

export function ResultTable({ data, onDataChange }: ResultTableProps) {
  const [editingCell, setEditingCell] = useState<{
    swimmerIdx: number;
    field: string;
    timeIdx?: number;
  } | null>(null);

  const totalReps = data.menu.repCount * data.menu.setCount;

  const updateSwimmer = useCallback(
    (idx: number, updates: Partial<SwimmerResult>) => {
      const newSwimmers = [...data.swimmers];
      newSwimmers[idx] = { ...newSwimmers[idx]!, ...updates };
      onDataChange({ ...data, swimmers: newSwimmers });
    },
    [data, onDataChange],
  );

  const updateTime = useCallback(
    (swimmerIdx: number, timeIdx: number, value: string) => {
      const newTimes = [...data.swimmers[swimmerIdx]!.times];
      if (value === "" || value === "-") {
        newTimes[timeIdx] = null;
      } else {
        const num = parseFloat(value);
        newTimes[timeIdx] = isNaN(num) ? null : num;
      }
      updateSwimmer(swimmerIdx, { times: newTimes });
    },
    [data.swimmers, updateSwimmer],
  );

  const addSwimmer = useCallback(() => {
    const newSwimmer: SwimmerResult = {
      no: data.swimmers.length + 1,
      name: "",
      style: "Fr",
      times: Array(totalReps).fill(null) as (number | null)[],
    };
    onDataChange({ ...data, swimmers: [...data.swimmers, newSwimmer] });
  }, [data, totalReps, onDataChange]);

  const removeSwimmer = useCallback(
    (idx: number) => {
      if (data.swimmers.length <= 1) return;
      const newSwimmers = data.swimmers.filter((_, i) => i !== idx);
      newSwimmers.forEach((s, i) => (s.no = i + 1));
      onDataChange({ ...data, swimmers: newSwimmers });
    },
    [data, onDataChange],
  );

  const getCellStyle = (time: number | null, swimmer: SwimmerResult) => {
    if (time === null) return "bg-yellow-50 text-gray-400";
    const fastest = fastestTime(swimmer.times);
    const slowest = slowestTime(swimmer.times);
    if (time === fastest) return "text-red-600 font-bold";
    if (time === slowest) return "text-blue-600";
    return "";
  };

  // Generate set header labels
  const setHeaders: { label: string; colSpan: number }[] = [];
  for (let s = 0; s < data.menu.setCount; s++) {
    setHeaders.push({ label: `Set ${s + 1}`, colSpan: data.menu.repCount });
  }

  return (
    <div className="w-full space-y-4">
      {/* Menu info */}
      <div className="rounded-lg bg-gray-50 px-4 py-3">
        <p className="text-sm font-medium text-gray-700">
          {data.menu.description || `${data.menu.setCount}s x ${data.menu.repCount} x ${data.menu.distance}m`}
          {data.menu.circle && ` / サークル ${data.menu.circle}秒`}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead>
            {/* Set row */}
            <tr className="border-b bg-gray-100">
              <th className="sticky left-0 z-10 bg-gray-100 px-2 py-1" colSpan={3} />
              {setHeaders.map((h, i) => (
                <th
                  key={i}
                  colSpan={h.colSpan}
                  className="border-l px-2 py-1 text-center text-xs font-medium text-gray-500"
                >
                  {h.label}
                </th>
              ))}
              <th className="border-l px-2 py-1 text-center text-xs font-medium text-gray-500">
                統計
              </th>
              <th className="w-8" />
            </tr>
            {/* Column headers */}
            <tr className="border-b bg-gray-50">
              <th className="sticky left-0 z-10 bg-gray-50 px-2 py-2 text-left font-medium">
                No
              </th>
              <th className="sticky left-8 z-10 bg-gray-50 px-2 py-2 text-left font-medium">
                名前
              </th>
              <th className="px-2 py-2 text-center font-medium">種目</th>
              {Array.from({ length: totalReps }, (_, i) => (
                <th key={i} className="border-l px-2 py-2 text-center font-medium">
                  {i + 1}
                </th>
              ))}
              <th className="border-l px-2 py-2 text-center font-medium">平均</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {data.swimmers.map((swimmer, sIdx) => {
              const avg = averageTime(swimmer.times);
              return (
                <tr key={sIdx} className="border-b hover:bg-gray-50">
                  <td className="sticky left-0 z-10 bg-white px-2 py-2 text-center font-medium">
                    {swimmer.no}
                  </td>
                  <td className="sticky left-8 z-10 bg-white px-2 py-2">
                    {editingCell?.swimmerIdx === sIdx && editingCell?.field === "name" ? (
                      <input
                        type="text"
                        value={swimmer.name}
                        onChange={(e) => updateSwimmer(sIdx, { name: e.target.value })}
                        onBlur={() => setEditingCell(null)}
                        onKeyDown={(e) => e.key === "Enter" && setEditingCell(null)}
                        className="w-20 rounded border px-1 py-0.5 text-sm"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:text-blue-600"
                        onClick={() => setEditingCell({ swimmerIdx: sIdx, field: "name" })}
                      >
                        {swimmer.name || <span className="text-gray-400">未入力</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {editingCell?.swimmerIdx === sIdx && editingCell?.field === "style" ? (
                      <select
                        value={swimmer.style}
                        onChange={(e) => {
                          updateSwimmer(sIdx, { style: e.target.value as SwimStroke });
                          setEditingCell(null);
                        }}
                        onBlur={() => setEditingCell(null)}
                        className="rounded border px-1 py-0.5 text-sm"
                        autoFocus
                      >
                        {STROKE_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className="cursor-pointer hover:text-blue-600"
                        onClick={() => setEditingCell({ swimmerIdx: sIdx, field: "style" })}
                      >
                        {swimmer.style}
                      </span>
                    )}
                  </td>
                  {swimmer.times.map((time, tIdx) => (
                    <td
                      key={tIdx}
                      className={`border-l px-1 py-2 text-center tabular-nums ${getCellStyle(time, swimmer)}`}
                    >
                      {editingCell?.swimmerIdx === sIdx &&
                      editingCell?.field === "time" &&
                      editingCell?.timeIdx === tIdx ? (
                        <input
                          type="text"
                          value={time?.toString() ?? ""}
                          onChange={(e) => updateTime(sIdx, tIdx, e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === "Tab") {
                              setEditingCell(null);
                            }
                          }}
                          className="w-14 rounded border px-1 py-0.5 text-center text-sm"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="cursor-pointer"
                          onClick={() =>
                            setEditingCell({ swimmerIdx: sIdx, field: "time", timeIdx: tIdx })
                          }
                        >
                          {time !== null ? time.toFixed(1) : "-"}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="border-l px-2 py-2 text-center tabular-nums font-medium">
                    {avg !== null ? avg.toFixed(1) : "-"}
                  </td>
                  <td className="px-1 py-2 text-center">
                    <button
                      onClick={() => removeSwimmer(sIdx)}
                      className="text-gray-400 hover:text-red-500"
                      title="削除"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-start">
        <Button variant="ghost" size="sm" onClick={addSwimmer}>
          + 選手を追加
        </Button>
      </div>
    </div>
  );
}
