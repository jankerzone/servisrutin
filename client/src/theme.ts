import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
	palette: {
		primary: {
			main: '#2563eb', // Modern blue
			light: '#60a5fa',
			dark: '#1e40af',
			contrastText: '#ffffff',
		},
		secondary: {
			main: '#7c3aed', // Purple
			light: '#a78bfa',
			dark: '#5b21b6',
			contrastText: '#ffffff',
		},
		success: {
			main: '#10b981',
			light: '#34d399',
			dark: '#059669',
		},
		warning: {
			main: '#f59e0b',
			light: '#fbbf24',
			dark: '#d97706',
		},
		error: {
			main: '#ef4444',
			light: '#f87171',
			dark: '#dc2626',
		},
		background: {
			default: '#f8fafc',
			paper: '#ffffff',
		},
		text: {
			primary: '#1e293b',
			secondary: '#64748b',
		},
	},
	typography: {
		fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
		h4: {
			fontWeight: 700,
			fontSize: '2rem',
			lineHeight: 1.2,
		},
		h5: {
			fontWeight: 600,
			fontSize: '1.5rem',
			lineHeight: 1.3,
		},
		h6: {
			fontWeight: 600,
			fontSize: '1.25rem',
			lineHeight: 1.4,
		},
		body1: {
			fontSize: '1rem',
			lineHeight: 1.6,
		},
		body2: {
			fontSize: '0.875rem',
			lineHeight: 1.5,
		},
		button: {
			textTransform: 'none',
			fontWeight: 600,
		},
	},
	shape: {
		borderRadius: 12,
	},
	shadows: [
		'none',
		'0 1px 2px 0 rgb(0 0 0 / 0.05)',
		'0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
		'0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
		'0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
		'0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
		'0 25px 50px -12px rgb(0 0 0 / 0.25)',
		'0 25px 50px -12px rgb(0 0 0 / 0.25)',
		'0 25px 50px -12px rgb(0 0 0 / 0.25)',
		'0 25px 50px -12px rgb(0 0 0 / 0.25)',
		'0 25px 50px -12px rgb(0 0 0 / 0.25)',
		'0 25px 50px -12px rgb(0 0 0 / 0.25)',
		'0 25px 50px -12px rgb(0 0 0 / 0.25)',
		'0 25px 50px -12px rgb(0 0 0 / 0.25)',
		'0 25px 50px -12px rgb(0 0 0 / 0.25)',
		'0 25px 50px -12px rgb(0 0 0 / 0.25)',
		'0 25px 50px -12px rgb(0 0 0 / 0.25)',
		'0 25px 50px -12px rgb(0 0 0 / 0.25)',
		'0 25px 50px -12px rgb(0 0 0 / 0.25)',
		'0 25px 50px -12px rgb(0 0 0 / 0.25)',
		'0 25px 50px -12px rgb(0 0 0 / 0.25)',
		'0 25px 50px -12px rgb(0 0 0 / 0.25)',
		'0 25px 50px -12px rgb(0 0 0 / 0.25)',
		'0 25px 50px -12px rgb(0 0 0 / 0.25)',
		'0 25px 50px -12px rgb(0 0 0 / 0.25)',
	],
	components: {
		MuiButton: {
			styleOverrides: {
				root: {
					borderRadius: 8,
					padding: '10px 20px',
					boxShadow: 'none',
					'&:hover': {
						boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
					},
				},
				contained: {
					'&:hover': {
						boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
					},
				},
			},
		},
		MuiCard: {
			styleOverrides: {
				root: {
					borderRadius: 16,
					boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
					transition: 'all 0.2s ease-in-out',
					'&:hover': {
						boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
						transform: 'translateY(-2px)',
					},
				},
			},
		},
		MuiPaper: {
			styleOverrides: {
				root: {
					backgroundImage: 'none',
				},
				elevation1: {
					boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
				},
			},
		},
		MuiAppBar: {
			styleOverrides: {
				root: {
					boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
				},
			},
		},
		MuiLinearProgress: {
			styleOverrides: {
				root: {
					height: 10,
					borderRadius: 5,
					backgroundColor: '#e2e8f0',
				},
				bar: {
					borderRadius: 5,
				},
			},
		},
		MuiFab: {
			styleOverrides: {
				root: {
					boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
					'&:hover': {
						boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
					},
				},
			},
		},
		MuiTextField: {
			styleOverrides: {
				root: {
					'& .MuiOutlinedInput-root': {
						'&:hover fieldset': {
							borderColor: '#60a5fa',
						},
					},
				},
			},
		},
	},
});
