"use client";

import { useCallback, useRef } from "react";
import type { ScanTimesheetResponse } from "@swimhub-scanner/shared";
import { averageTime, fastestTime, slowestTime, formatTime } from "@swimhub-scanner/shared";
import { Button } from "@/components/ui/Button";

interface ExportButtonsProps {
  data: ScanTimesheetResponse;
}

function getDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function buildRows(data: ScanTimesheetResponse) {
  const totalReps = data.menu.repCount * data.menu.setCount;
  const headers = [
    "No",
    "名前",
    "種目",
    ...Array.from({ length: totalReps }, (_, i) => `${i + 1}本目`),
    "平均",
    "最速",
    "最遅",
  ];

  const rows = data.swimmers.map((s) => {
    const avg = averageTime(s.times);
    const fast = fastestTime(s.times);
    const slow = slowestTime(s.times);
    return [
      s.no,
      s.name,
      s.style,
      ...s.times.map((t) => (t !== null ? t : "")),
      avg !== null ? avg : "",
      fast !== null ? fast : "",
      slow !== null ? slow : "",
    ];
  });

  return { headers, rows };
}

export function ExportButtons({ data }: ExportButtonsProps) {
  const tableRef = useRef<HTMLDivElement>(null);

  const exportCSV = useCallback(() => {
    const { headers, rows } = buildRows(data);
    const bom = "\uFEFF"; // UTF-8 BOM for Excel compatibility
    const csvContent =
      bom +
      [headers.join(","), ...rows.map((row) => row.map((v) => `"${v}"`).join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `タイム記録_${getDateString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const exportExcel = useCallback(async () => {
    const XLSX = await import("xlsx");
    const { headers, rows } = buildRows(data);

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws["!cols"] = [
      { wch: 4 }, // No
      { wch: 12 }, // Name
      { wch: 5 }, // Style
      ...Array(data.menu.repCount * data.menu.setCount).fill({ wch: 7 }),
      { wch: 7 }, // Avg
      { wch: 7 }, // Fast
      { wch: 7 }, // Slow
    ];

    const wb = XLSX.utils.book_new();

    // Add menu info as first row
    const infoSheet = XLSX.utils.aoa_to_sheet([
      ["メニュー", data.menu.description],
      [
        "距離",
        `${data.menu.distance}m`,
        "本数",
        `${data.menu.repCount}`,
        "セット数",
        `${data.menu.setCount}`,
      ],
      ...(data.menu.circle ? [["サークル", `${data.menu.circle}秒`]] : []),
      [],
      ...wsData,
    ]);
    infoSheet["!cols"] = ws["!cols"];

    XLSX.utils.book_append_sheet(wb, infoSheet, "タイム記録");
    XLSX.writeFile(wb, `タイム記録_${getDateString()}.xlsx`);
  }, [data]);

  const exportImage = useCallback(async () => {
    if (!tableRef.current) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const scale = 2; // Retina

    const totalReps = data.menu.repCount * data.menu.setCount;
    const colWidths = {
      no: 40,
      name: 100,
      style: 50,
      time: 60,
      stat: 60,
    };
    const rowHeight = 32;
    const headerHeight = 56;
    const menuHeight = 48;
    const footerHeight = 32;
    const padding = 16;

    const tableWidth =
      colWidths.no +
      colWidths.name +
      colWidths.style +
      totalReps * colWidths.time +
      colWidths.stat * 3;
    const tableHeight =
      menuHeight + headerHeight + data.swimmers.length * rowHeight + footerHeight;

    canvas.width = (tableWidth + padding * 2) * scale;
    canvas.height = (tableHeight + padding * 2) * scale;
    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width / scale, canvas.height / scale);

    const startX = padding;
    let y = padding;

    // Menu header
    ctx.fillStyle = "#1f2937";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("タイム記録表", startX, y + 16);
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#6b7280";
    const menuText =
      `${data.menu.description || `${data.menu.setCount}s x ${data.menu.repCount} x ${data.menu.distance}m`}` +
      (data.menu.circle ? ` / サークル ${data.menu.circle}秒` : "");
    ctx.fillText(menuText, startX, y + 36);
    y += menuHeight;

    // Table header
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(startX, y, tableWidth, headerHeight / 2);
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(startX, y + headerHeight / 2, tableWidth, headerHeight / 2);

    ctx.fillStyle = "#374151";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";

    let x = startX;
    ctx.fillText("No", x + colWidths.no / 2, y + headerHeight / 2 + 18);
    x += colWidths.no;
    ctx.textAlign = "left";
    ctx.fillText("名前", x + 4, y + headerHeight / 2 + 18);
    x += colWidths.name;
    ctx.textAlign = "center";
    ctx.fillText("種目", x + colWidths.style / 2, y + headerHeight / 2 + 18);
    x += colWidths.style;

    for (let i = 0; i < totalReps; i++) {
      ctx.fillText(`${i + 1}`, x + colWidths.time / 2, y + headerHeight / 2 + 18);
      x += colWidths.time;
    }
    ctx.fillText("平均", x + colWidths.stat / 2, y + headerHeight / 2 + 18);
    x += colWidths.stat;
    ctx.fillText("最速", x + colWidths.stat / 2, y + headerHeight / 2 + 18);
    x += colWidths.stat;
    ctx.fillText("最遅", x + colWidths.stat / 2, y + headerHeight / 2 + 18);

    y += headerHeight;

    // Data rows
    data.swimmers.forEach((swimmer, sIdx) => {
      const avg = averageTime(swimmer.times);
      const fast = fastestTime(swimmer.times);
      const slow = slowestTime(swimmer.times);

      if (sIdx % 2 === 1) {
        ctx.fillStyle = "#f9fafb";
        ctx.fillRect(startX, y, tableWidth, rowHeight);
      }

      // Grid lines
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(startX, y + rowHeight);
      ctx.lineTo(startX + tableWidth, y + rowHeight);
      ctx.stroke();

      ctx.font = "12px sans-serif";
      x = startX;

      ctx.fillStyle = "#1f2937";
      ctx.textAlign = "center";
      ctx.fillText(`${swimmer.no}`, x + colWidths.no / 2, y + 20);
      x += colWidths.no;

      ctx.textAlign = "left";
      ctx.fillText(swimmer.name, x + 4, y + 20);
      x += colWidths.name;

      ctx.textAlign = "center";
      ctx.fillText(swimmer.style, x + colWidths.style / 2, y + 20);
      x += colWidths.style;

      swimmer.times.forEach((time) => {
        if (time !== null) {
          if (time === fast) {
            ctx.fillStyle = "#dc2626";
            ctx.font = "bold 12px sans-serif";
          } else if (time === slow) {
            ctx.fillStyle = "#2563eb";
            ctx.font = "12px sans-serif";
          } else {
            ctx.fillStyle = "#1f2937";
            ctx.font = "12px sans-serif";
          }
          ctx.fillText(formatTime(time), x + colWidths.time / 2, y + 20);
        } else {
          ctx.fillStyle = "#d1d5db";
          ctx.font = "12px sans-serif";
          ctx.fillText("-", x + colWidths.time / 2, y + 20);
        }
        x += colWidths.time;
      });

      ctx.fillStyle = "#1f2937";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(avg !== null ? formatTime(avg) : "-", x + colWidths.stat / 2, y + 20);
      x += colWidths.stat;
      ctx.fillStyle = "#dc2626";
      ctx.fillText(fast !== null ? formatTime(fast) : "-", x + colWidths.stat / 2, y + 20);
      x += colWidths.stat;
      ctx.fillStyle = "#2563eb";
      ctx.fillText(slow !== null ? formatTime(slow) : "-", x + colWidths.stat / 2, y + 20);

      y += rowHeight;
    });

    // Footer
    ctx.fillStyle = "#9ca3af";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(
      "Generated by タイム記録表スキャナー",
      startX + tableWidth,
      y + footerHeight - 8,
    );

    // Download
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `タイム記録_${getDateString()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [data]);

  return (
    <div ref={tableRef} className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={exportImage}>
        画像で出力
      </Button>
      <Button variant="outline" onClick={exportCSV}>
        CSVで出力
      </Button>
      <Button variant="outline" onClick={exportExcel}>
        Excelで出力
      </Button>
    </div>
  );
}
