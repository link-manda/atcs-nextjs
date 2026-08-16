import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AIStationClient } from "./AIStationClient";
import { CCTVChannel } from "@/types/cctv";

const mockChannels: CCTVChannel[] = [
  {
    cctv_id: 1,
    ch_name: "PASAR SATRIA PTZ",
    streaming_url: "https://atcs.denpasarkota.go.id/hls/pasar_satria.m3u8",
    player_type: "video",
    latitude: -8.65,
    longitude: 115.22,
    region: "Denpasar",
    is_active: true,
  },
  {
    cctv_id: 2,
    ch_name: "SIMPANG DEWA RUCI",
    streaming_url: "https://atcs.badungkab.go.id/hls/dewa_ruci.m3u8",
    player_type: "video",
    latitude: -8.72,
    longitude: 115.18,
    region: "Badung",
    is_active: true,
  },
];

describe("AIStationClient", () => {
  beforeEach(() => {
    // Mock HTMLMediaElement play
    window.HTMLMediaElement.prototype.play = jest.fn().mockImplementation(() => Promise.resolve());
  });

  it("renders AI Traffic Station heading and initial channel name", () => {
    render(<AIStationClient channels={mockChannels} />);

    expect(screen.getByText("Pantauan Cerdas AI")).toBeInTheDocument();
    expect(screen.getAllByText("PASAR SATRIA PTZ").length).toBeGreaterThan(0);
  });

  it("renders all vehicle categories with Lucide labels", () => {
    render(<AIStationClient channels={mockChannels} />);

    expect(screen.getByText("Total Kendaraan Terhitung")).toBeInTheDocument();
    expect(screen.getByText("Mobil")).toBeInTheDocument();
    expect(screen.getByText("Motor")).toBeInTheDocument();
    expect(screen.getByText("Bus")).toBeInTheDocument();
    expect(screen.getByText("Truk")).toBeInTheDocument();
  });

  it("allows toggling camera selector dropdown", () => {
    render(<AIStationClient channels={mockChannels} />);

    // Open dropdown
    const selectBtn = screen.getByRole("button", { name: /PASAR SATRIA PTZ/i });
    fireEvent.click(selectBtn);

    // Should see search input and second camera
    expect(screen.getByPlaceholderText("Cari kamera atau wilayah...")).toBeInTheDocument();
    expect(screen.getByText("SIMPANG DEWA RUCI")).toBeInTheDocument();
  });

  it("renders Adaptive Night Vision, 512px Sharpening, and 1:1 Frame-Lock toggles", () => {
    render(<AIStationClient channels={mockChannels} />);

    expect(screen.getByText("Mode Malam Otomatis")).toBeInTheDocument();
    expect(screen.getByText("Penajaman Citra (512px HD)")).toBeInTheDocument();
    expect(screen.getByText("Sinkronisasi Frame (1:1 Lock)")).toBeInTheDocument();

    const activeButtons = screen.getAllByRole("button", { name: /Aktif/i });
    expect(activeButtons.length).toBeGreaterThanOrEqual(3);
  });

  it("renders Target AI FPS buttons and allows changing rate", () => {
    render(<AIStationClient channels={mockChannels} />);

    expect(screen.getByText("Laju Analisis AI (FPS)")).toBeInTheDocument();
    const fps15Btn = screen.getByRole("button", { name: "15 FPS" });
    expect(fps15Btn).toBeInTheDocument();
    fireEvent.click(fps15Btn);
    expect(screen.getByText("15 FPS Target")).toBeInTheDocument();
  });

  it("renders Hapus Cache button next to Reset button", () => {
    render(<AIStationClient channels={mockChannels} />);

    expect(screen.getByRole("button", { name: /Reset/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hapus Cache/i })).toBeInTheDocument();
  });
});
