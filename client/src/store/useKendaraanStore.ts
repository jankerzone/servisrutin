import { create } from 'zustand';

interface KendaraanStore {
	selectedKendaraanId: number | null;
	currentKm: number;
	setSelectedKendaraanId: (id: number | null) => void;
	setCurrentKm: (km: number) => void;
}

export const useKendaraanStore = create<KendaraanStore>((set) => ({
	selectedKendaraanId: null,
	currentKm: 0,
	setSelectedKendaraanId: (id) => set({ selectedKendaraanId: id }),
	setCurrentKm: (km) => set({ currentKm: km }),
}));
