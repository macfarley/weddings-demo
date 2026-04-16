import Link from 'next/link';
import { useState } from 'react';
import { usePalette } from '../context/PaletteContext';

export default function NavBar() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const { palette } = usePalette();

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
						<Link href="/" className="nav-link" style={{
							color: palette.text,
							borderColor: palette.primary,
						}}>Home</Link>
						<Link href="/gallery" className="nav-link" style={{
							color: palette.text,
							borderColor: palette.primary,
						}}>Gallery</Link>
						<Link href="/guestbook" className="nav-link" style={{
							color: palette.text,
							borderColor: palette.primary,
						}}>Guestbook</Link>
						<Link href="/about" className="nav-link" style={{
							color: palette.text,
							borderColor: palette.primary,
						}}>About</Link>					<Link href="/program" className="nav-link" style={{
						color: palette.text,
						borderColor: palette.primary,
					}}>Program</Link>						<Link href="/sendyourphotos" className="nav-link" style={{
							color: palette.text,
							borderColor: palette.primary,
						}}>Send Your Photos</Link>
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
							<li><Link href="/" className="nav-link" style={{
								color: palette.text,
								borderColor: palette.primary,
							}}>Home</Link></li>
							<li><Link href="/gallery" className="nav-link" style={{
								color: palette.text,
								borderColor: palette.primary,
							}}>Gallery</Link></li>
							<li><Link href="/guestbook" className="nav-link" style={{
								color: palette.text,
								borderColor: palette.primary,
							}}>Guestbook</Link></li>
							<li><Link href="/about" className="nav-link" style={{
								color: palette.text,
								borderColor: palette.primary,
							}}>About</Link></li>						<li><Link href="/program" className="nav-link" style={{
							color: palette.text,
							borderColor: palette.primary,
						}}>Program</Link></li>							<li><Link href="/sendyourphotos" className="nav-link" style={{
								color: palette.text,
								borderColor: palette.primary,
							}}>Send Your Photos</Link></li>
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