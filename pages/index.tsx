import Link from 'next/link';
import { usePalette } from '../context/PaletteContext';
import '../styles/pages/index.css';

export default function HomePage() {
	const { palette } = usePalette();

	return (
		<div className="page-container">
			<main className="main-content">
				<section
					className="section-full"
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
						<div className="event-details-grid">
							<article className="event-detail-card">
								<span className="event-detail-label" style={{ color: palette.primary }}>Event Details</span>
								<p className="event-detail-content">Schedule, venue details, and key wedding-day info.</p>
								<Link className="event-detail-link" style={{ color: palette.primary }} href="/event-details">Open Event Details</Link>
							</article>

							<article className="event-detail-card">
								<span className="event-detail-label" style={{ color: palette.primary }}>Gallery</span>
								<p className="event-detail-content">Approved photos from guests and wedding moments.</p>
								<Link className="event-detail-link" style={{ color: palette.primary }} href="/gallery">Open Gallery</Link>
							</article>

							<article className="event-detail-card">
								<span className="event-detail-label" style={{ color: palette.primary }}>Guestbook</span>
								<p className="event-detail-content">Leave a message for the couple and read approved notes.</p>
								<Link className="event-detail-link" style={{ color: palette.primary }} href="/guestbook">Open Guestbook</Link>
							</article>

							<article className="event-detail-card">
								<span className="event-detail-label" style={{ color: palette.primary }}>Send Your Photos</span>
								<p className="event-detail-content">Upload your photos for moderation and gallery publishing.</p>
								<Link className="event-detail-link" style={{ color: palette.primary }} href="/sendyourphotos">Upload Photos</Link>
							</article>
						</div>
					</section>
				</section>
			</main>
		</div>
	);
}
