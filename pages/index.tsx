// pages/index.tsx — Main landing page.
//
// showCongratsBanner: Evaluated once at module load (server-render + client hydration).
// Displays a congratulations note from Mac until June 9, 2026, one month post-ceremony.
// The banner is soft — warm, not promotional — positioned above the hero section.
//
// Navigation pills use a stoplight color system (red/yellow/green) that mirrors
// the NavBar links and communicates priority/status at a glance.
import Link from 'next/link';
import { usePalette } from '../context/PaletteContext';

// Show the post-ceremony congratulations banner until one month after the wedding.
const showCongratsBanner = new Date() < new Date("2026-06-09T00:00:00");

export default function HomePage() {
	const { palette } = usePalette();

	return (
		<div className="page-container">
			<main className="main-content">
				{showCongratsBanner && (
					<div style={{
						width: '100%',
						backgroundColor: '#f7f7f7',
						textAlign: 'center',
						padding: '1rem 1.5rem',
						borderRadius: '0.375rem',
						boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
						marginBottom: '1.5rem',
						borderLeft: `4px solid ${palette?.primary ?? '#b7a99a'}`,
					}}>
						<p style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
							Message from Mac McCoy, your Romance Websmith
						</p>
						<p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '0.35rem', marginBottom: 0 }}>
							Congratulations to the newlyweds — and best wishes as you begin this next chapter together.
							Thank you for letting me help craft a small digital piece of your story.
						</p>
					</div>
				)}
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
						John & Crystal May&apos;s Wedding Website
					</h1>
				{/* Wedding cake hero image */}
				<div className="home-cake-wrap">
					<img
						src="/photos/cake.png"
						alt="A beautiful tiered wedding cake decorated with pink roses"
						className="home-cake-img"
					/>
				</div>

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
