import { describe, it, expect } from 'vitest';
import { formatRupiah } from './utils';

describe('formatRupiah', () => {
	it('formats zero correctly', () => {
		expect(formatRupiah(0)).toMatch(/Rp\s?0/);
	});

	it('formats positive numbers correctly', () => {
		expect(formatRupiah(1000)).toMatch(/Rp\s?1\.000/);
		expect(formatRupiah(50000)).toMatch(/Rp\s?50\.000/);
	});

	it('formats negative numbers correctly', () => {
		expect(formatRupiah(-1000)).toMatch(/-Rp\s?1\.000/);
	});

	it('formats large numbers correctly', () => {
		expect(formatRupiah(1000000000)).toMatch(/Rp\s?1\.000\.000\.000/);
	});

	it('rounds decimal numbers correctly', () => {
		expect(formatRupiah(1000.4)).toMatch(/Rp\s?1\.000/);
		expect(formatRupiah(1000.5)).toMatch(/Rp\s?1\.001/);
	});
});
