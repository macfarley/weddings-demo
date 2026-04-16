import { usePalette } from '../context/PaletteContext';
import Head from 'next/head';

export default function About() {
  const { palette } = usePalette();

  const cardStyle = {
    backgroundColor: palette.secondary,
    borderLeftColor: palette.primary,
    color: palette.text,
  };

  const cardSubtitleStyle = {
    color: palette.primary,
  };

  const creatorLinkStyle = {
    color: palette.primary,
    backgroundColor: palette.secondary,
    borderColor: palette.primary,
  };

  return (
    <>
      <Head>
        <title>About Us</title>
        <meta name="description" content="Our love story and journey together" />
      </Head>

      <main style={{ backgroundColor: palette.background }}>
        <div className="page-container">
          <div className="about-container">
            <div className="about-intro">
              <h1 style={{ color: palette.text }}>Our Story</h1>
              <p style={{ color: palette.text }}>
                A journey of love, laughter, and unforgettable moments
              </p>
              <img
                src="/photos/glassespic.jpg"
                alt="John and Crystal smiling together"
                className="about-intro-image"
              />
            </div>

            <div className="about-cards-container">
              {/* His Card */}
              <div className="about-card" style={cardStyle}>
                <h2 className="about-card-title" style={{ color: palette.primary }}>
                  His
                </h2>

                <div className="about-card-section">
                  <p className="about-card-content">
                    <strong>John Michael May Jr.</strong> is a pretty simple guy. He loves his family,
                    his girl, and his kids — and they always make him smile.
                  </p>
                </div>

                <div className="about-card-section">
                  <p className="about-card-subtitle" style={cardSubtitleStyle}>
                    Parents
                  </p>
                  <p className="about-card-content">John Michael May Sr. and Kimberly Bowles.</p>
                </div>

                <div className="about-card-section">
                  <p className="about-card-subtitle" style={cardSubtitleStyle}>
                    High School
                  </p>
                  <p className="about-card-content">Franklin Heights.</p>
                </div>

                <div className="about-card-section">
                  <p className="about-card-subtitle" style={cardSubtitleStyle}>
                    College
                  </p>
                  <p className="about-card-content">
                    Focused on work, family, and real-life experience.
                  </p>
                </div>

                <div className="about-card-section">
                  <p className="about-card-subtitle" style={cardSubtitleStyle}>
                    Interests
                  </p>
                  <ul className="about-card-list" style={{ color: palette.text }}>
                    <li>Watching NASCAR</li>
                    <li>Collecting racecar diecasts</li>
                    <li>Playing guitar (when he gets the chance)</li>
                    <li>Drawing</li>
                    <li>Spending time with Crystal</li>
                  </ul>
                </div>
              </div>

              {/* Hers Card */}
              <div className="about-card" style={cardStyle}>
                <h2 className="about-card-title" style={{ color: palette.primary }}>
                  Hers
                </h2>

                <div className="about-card-section">
                  <p className="about-card-content">
                    <strong>Crystal Lynn Collins</strong> is a mom and a caregiver who loves taking
                    care of people. She loves bingo, and her family is what makes her smile.
                  </p>
                </div>

                <div className="about-card-section">
                  <p className="about-card-subtitle" style={cardSubtitleStyle}>
                    Parents
                  </p>
                  <p className="about-card-content">Traci Heckathorn and Mark Levi.</p>
                </div>

                <div className="about-card-section">
                  <p className="about-card-subtitle" style={cardSubtitleStyle}>
                    High School
                  </p>
                  <p className="about-card-content">Celina High School.</p>
                </div>

                <div className="about-card-section">
                  <p className="about-card-subtitle" style={cardSubtitleStyle}>
                    College
                  </p>
                  <p className="about-card-content">
                    Skipped college and jumped right into life and family.
                  </p>
                </div>

                <div className="about-card-section">
                  <p className="about-card-subtitle" style={cardSubtitleStyle}>
                    Interests
                  </p>
                  <ul className="about-card-list" style={{ color: palette.text }}>
                    <li>Bingo</li>
                    <li>Shooting pool</li>
                    <li>Throwing darts</li>
                    <li>Spending time with family</li>
                    <li>Cooking</li>
                  </ul>
                </div>
              </div>

              {/* Ours (Couple) Card */}
              <div className="about-card ours" style={cardStyle}>
                <h2 className="about-card-title" style={{ color: palette.primary }}>
                  Ours
                </h2>

                <div className="about-card-section">
                  <p className="about-card-subtitle" style={cardSubtitleStyle}>
                    The Meet Cute
                  </p>
                  <p className="about-card-content">
                    They met online and talked for a few weeks before trying to meet up. The
                    first attempt ended with John chickening out and standing Crystal up. After
                    some time apart, a Facebook video comment sparked conversation again.
                    Attempt two had car trouble, but they kept talking. On the third try,
                    Crystal drove to him in Columbus — John was nervous and shy, Crystal kissed
                    him, and everything clicked like they had known each other forever. They
                    have been together ever since: <strong>1/26/25</strong>.
                  </p>
                </div>

                <div className="about-card-section">
                  <p className="about-card-subtitle" style={cardSubtitleStyle}>
                    Our Love Story
                  </p>
                  <p className="about-card-content">
                    They met on <strong>1/26/25</strong>, moved in together just 10 days later,
                    and got engaged on <strong>3/22/25</strong>. From <strong>4/24/25</strong> to{' '}
                    <strong>4/28/25</strong>, they took their first trip together — a camping week
                    at Talladega for the NASCAR race. It was Crystal's first race and one of
                    John's bucket-list tracks.
                  </p>
                </div>

                <div className="about-card-section">
                  <p className="about-card-subtitle" style={cardSubtitleStyle}>
                    Our Future
                  </p>
                  <p className="about-card-content">
                    Their future is all about being healthy and happy together forever, saving
                    up for their forever home, and one day watching their kids get married and
                    have kids of their own.
                  </p>
                </div>
              </div>
            </div>

            {/* Creator Credit Section */}
            <div className="about-creator-section">
              <h3 style={{ color: palette.text, marginBottom: '1rem', fontSize: '1.1rem' }}>
                About the Creator
              </h3>
              <div className="about-creator-text" style={{ color: palette.text }}>
                <p>
                  This beautiful wedding site was created by{' '}
                  <strong style={{ color: palette.primary }}>Mac McCoy</strong>, a web
                  developer who specializes in creating custom, elegant websites for every
                  occasion.
                </p>
                <p style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
                  Whether you need a wedding site, portfolio, business website, or anything in
                  between, Mac can build exactly what you need.
                </p>
              </div>
              <a
                href="https://www.sitesbymac.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="about-creator-link"
                style={creatorLinkStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = palette.primary;
                  e.currentTarget.style.color = palette.secondary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = palette.secondary;
                  e.currentTarget.style.color = palette.primary;
                }}
              >
                Visit SitesbyMac.dev
              </a>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
