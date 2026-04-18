import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { usePalette } from '../context/PaletteContext';

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
						{ href: '/program',       label: 'Event Program',      variant: 'red' },
						{ href: '/about',         label: 'About the Couple',   variant: 'red' },
						{ href: '/gallery',       label: 'Photo Gallery',      variant: 'yellow' },
						{ href: '/guestbook',     label: 'Sign the Guestbook', variant: 'green' },
						{ href: '/sendyourphotos',label: 'Send Your Photos',   variant: 'green' },
					].map(({ href, label, variant }) => (
						<Link
							key={href}
							href={href}
							className={`nav-link nav-link--${variant}${isActive(href) ? ' nav-link--active' : ''}`}
							aria-current={isActive(href) ? 'page' : undefined}
							style={{ color: palette.text }}
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
							{ href: '/program',        label: 'Event Program',      variant: 'red' },
							{ href: '/about',          label: 'About the Couple',   variant: 'red' },
							{ href: '/gallery',        label: 'Photo Gallery',      variant: 'yellow' },
							{ href: '/guestbook',      label: 'Sign the Guestbook', variant: 'green' },
							{ href: '/sendyourphotos', label: 'Send Your Photos',   variant: 'green' },
						].map(({ href, label, variant }) => (
							<li key={href}><Link
								href={href}
								className={`nav-link nav-link--${variant}${isActive(href) ? ' nav-link--active' : ''}`}
								aria-current={isActive(href) ? 'page' : undefined}
								style={{ color: palette.text }}
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
					color: white;
			}
		`}</style>
	</nav>
	);
}