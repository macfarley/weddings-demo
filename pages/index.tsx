import Link from 'next/link';
import { usePalette } from '../context/PaletteContext';

export default function HomePage() {
	const { palette } = usePalette();

	return (
		<div className="page-container">
			<main className="main-content">
				<section
					className="section-full home-section"
					style={{
						color: palette.text,
						borderColor: palette.primary,
					}}
				>
					<h1
						className="page-title hero-title"
						style={{
							color: palette.primary,
							textShadow: `
								-1px -1px 0 ${palette.highlight},
								1px -1px 0 ${palette.highlight},
								-1px 1px 0 ${palette.highlight},
								1px 1px 0 ${palette.highlight}
							`,
						}}
					>
						John & Crystal&apos;s Wedding Website
					</h1>

					<p className="section-description" style={{ color: palette.text }}>
						Full site preview is now live while we keep refining final styles.
					</p>

					<section className="event-details-section section-full" style={{ borderColor: palette.primary }}>
						<h2 className="section-title" style={{ color: palette.primary }}>
							Explore
						</h2>
						<div className="explore-stoplight">
							{[
								{ href: '/program',        label: 'Event Program',      desc: 'Schedule, venue details, and key wedding-day info.',        variant: 'red' },
								{ href: '/about',          label: 'About the Couple',   desc: 'Learn about John & Crystal and their journey together.',    variant: 'red' },
								{ href: '/gallery',        label: 'Photo Gallery',      desc: 'Approved photos from guests and wedding moments.',          variant: 'yellow' },
								{ href: '/guestbook',      label: 'Sign the Guestbook', desc: 'Leave a message for the couple and read approved notes.',   variant: 'green' },
								{ href: '/sendyourphotos', label: 'Send Your Photos',   desc: 'Upload your own photos to be added to the gallery.',        variant: 'green' },
							].map(({ href, label, desc, variant }) => (
								<Link key={href} href={href} className={`explore-pill explore-pill--${variant}`}>
									<span className="explore-pill-label">{label}</span>
									<span className="explore-pill-desc">{desc}</span>
								</Link>
							))}
						</div>
					</section>
				{/* Venue flyer PDF link */}
				<section style={{ textAlign: 'center', marginTop: '1.5rem' }}>
					<p style={{ color: palette.text, marginBottom: '0.75rem', fontSize: '0.95rem' }}>
						Printing flyers for the venue? Download a shareable QR code card.
					</p>
					<Link
						href="/qrcodeflyer"
						target="_blank"
						rel="noopener noreferrer"
						className="flyer-pill-btn"
						style={{
							borderColor: palette.primary,
							color: palette.primary,
						}}
					>
						🖨️ Open Venue Flyer (PDF)
					</Link>
				</section>				</section>
			</main>
		</div>
	);
}
