import { create } from 'zustand';

interface KendaraanStore {
	selectedKendaraanId: number | null;
	currentKm: number;
	setSelectedKendaraanId: (id: number) => void;
	setCurrentKm: (km: number) => void;
}

export const useKendaraanStore = create<KendaraanStore>((set) => ({
	selectedKendaraanId: 1,
	currentKm: 0,
	setSelectedKendaraanId: (id) => set({ selectedKendaraanId: id }),
	setCurrentKm: (km) => set({ currentKm: km }),
}));
