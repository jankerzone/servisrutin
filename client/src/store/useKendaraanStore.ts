import { create } from 'zustand';

interface KendaraanStore {
	selectedKendaraanId: number | null;
	setSelectedKendaraanId: (id: number) => void;
}

export const useKendaraanStore = create<KendaraanStore>((set) => ({
	selectedKendaraanId: 1,
	setSelectedKendaraanId: (id) => set({ selectedKendaraanId: id }),
}));
