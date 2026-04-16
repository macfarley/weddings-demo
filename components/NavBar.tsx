import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { usePalette } from '../context/PaletteContext';

const ACTIVE_BG = 'rgba(200, 235, 205, 0.95)';

export default function NavBar() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const { palette } = usePalette();
	const router = useRouter();
	const isActive = (href: string) => router.pathname === href;

	return (
		<nav
			className="navbar"
			style={{ borderBottom: `4px solid ${palette.primary}` }}
			aria-label="Main navigation"
		>
			<div className="navbar-container">
				<div className="navbar-content">
					{/* Brand - left */}
					<Link
						href="/"
						className="navbar-brand"
						style={{ color: palette.primary }}
						aria-label="Wedding Home"
					>
						John & Crystal's Wedding | May 9, 2026
					</Link>
					{/* Desktop links */}
				<div className="navbar-links">
					{[
						{ href: '/', label: 'Home' },
						{ href: '/gallery', label: 'Gallery' },
						{ href: '/guestbook', label: 'Guestbook' },
						{ href: '/about', label: 'About' },
						{ href: '/program', label: 'Program' },
						{ href: '/sendyourphotos', label: 'Send Your Photos' },
					].map(({ href, label }) => (
						<Link
							key={href}
							href={href}
							className="nav-link"
							aria-current={isActive(href) ? 'page' : undefined}
							style={{
								color: palette.text,
								borderColor: isActive(href) ? '#111111' : palette.primary,
								backgroundColor: isActive(href) ? ACTIVE_BG : undefined,
							}}
						>{label}</Link>
					))}
				</div>
					{/* Hamburger for mobile */}
					<button
						className="navbar-hamburger"
						style={{
							color: palette.primary,
						}}
						onClick={() => setIsMenuOpen(!isMenuOpen)}
						aria-expanded={isMenuOpen}
						aria-label="Toggle navigation menu"
					>
						<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					</button>
				</div>
				{/* Mobile menu */}
			{isMenuOpen && (
				<div className="navbar-menu">
					<ul>
						{[
							{ href: '/', label: 'Home' },
							{ href: '/gallery', label: 'Gallery' },
							{ href: '/guestbook', label: 'Guestbook' },
							{ href: '/about', label: 'About' },
							{ href: '/program', label: 'Program' },
							{ href: '/sendyourphotos', label: 'Send Your Photos' },
						].map(({ href, label }) => (
							<li key={href}><Link
								href={href}
								className="nav-link"
								aria-current={isActive(href) ? 'page' : undefined}
								style={{
									color: palette.text,
									borderColor: isActive(href) ? '#111111' : palette.primary,
									backgroundColor: isActive(href) ? ACTIVE_BG : undefined,
								}}
							>{label}</Link></li>
						))}
					</ul>
				</div>
			)}
			</div>
			{/* Dynamic nav link styles for palette colors */}
			<style jsx>{`
				.nav-link:hover,
				.nav-link:focus {
					background-color: ${palette.primary};
					color: white;
					font-weight: bold;
					border-width: 4px;
					box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
				}
				.nav-link:focus {				outline: none;
				box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
			}
		`}</style>
	</nav>
	);
}