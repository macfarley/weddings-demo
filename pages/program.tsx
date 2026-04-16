import { usePalette } from '../context/PaletteContext';
import Head from 'next/head';

interface ProgramItem {
  time: string;
  event: string;
  description?: string;
}

const ceremonyProgram: ProgramItem[] = [
  {
    time: '3:45 PM',
    event: 'Guests Arrive',
    description: 'Please arrive early to find your seat',
  },
  {
    time: '4:00 PM',
    event: 'Ceremony Begins',
    description: 'Music and processional',
  },
  {
    time: '4:15 PM',
    event: 'Exchange of Vows',
    description: 'Personal vows and rings',
  },
  {
    time: '4:25 PM',
    event: 'Pronouncement',
    description: 'First kiss as a married couple!',
  },
  {
    time: '4:30 PM',
    event: 'Recessional',
    description: 'Newlyweds exit',
  },
];

const receptionProgram: ProgramItem[] = [
  {
    time: '5:30 PM',
    event: 'Reception Begins',
    description: 'Cocktails and appetizers',
  },
  {
    time: '6:00 PM',
    event: 'Dinner Service',
    description: 'Seated dinner',
  },
  {
    time: '6:45 PM',
    event: 'Toasts & Speeches',
    description: 'From family and friends',
  },
  {
    time: '7:15 PM',
    event: 'First Dance',
    description: 'Dancing begins!',
  },
  {
    time: '7:30 PM',
    event: 'Cake Cutting',
    description: 'Dessert time',
  },
  {
    time: '8:00 PM',
    event: 'Open Dancing',
    description: 'All night celebration',
  },
  {
    time: '10:00 PM',
    event: 'Closing Time',
    description: 'Thanks for celebrating with us!',
  },
];

export default function Program() {
  const { palette } = usePalette();

  return (
    <>
      <Head>
        <title>Wedding Program</title>
        <meta name="description" content="Ceremony and reception program timeline" />
      </Head>

      <main style={{ backgroundColor: palette.background }}>
        <div className="page-container">
          <div className="program-container">
            {/* Header */}
            <div
              className="program-header"
              style={{
                backgroundColor: palette.secondary,
                borderColor: palette.primary,
                color: palette.text,
              }}
            >
              <h1 style={{ color: palette.primary }}>Wedding Program</h1>
              <p>Friday, May 9, 2026 • Junior Fair Building, Wapakoneta, Ohio</p>
            </div>

            {/* Ceremony */}
            <section className="program-section">
              <h2
                className="program-section-title"
                style={{
                  backgroundColor: palette.primary,
                  color: palette.secondary,
                }}
              >
                Ceremony
              </h2>
              <div className="program-timeline">
                {ceremonyProgram.map((item, i) => (
                  <div
                    key={i}
                    className="program-item"
                    style={{
                      borderColor: palette.primary,
                    }}
                  >
                    <div className="program-time" style={{ color: palette.primary }}>
                      {item.time}
                    </div>
                    <div className="program-details">
                      <div className="program-event" style={{ color: palette.text }}>
                        {item.event}
                      </div>
                      {item.description && (
                        <div
                          className="program-description"
                          style={{ color: palette.text }}
                        >
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Reception */}
            <section className="program-section">
              <h2
                className="program-section-title"
                style={{
                  backgroundColor: palette.primary,
                  color: palette.secondary,
                }}
              >
                Reception
              </h2>
              <div className="program-timeline">
                {receptionProgram.map((item, i) => (
                  <div
                    key={i}
                    className="program-item"
                    style={{
                      borderColor: palette.primary,
                    }}
                  >
                    <div className="program-time" style={{ color: palette.primary }}>
                      {item.time}
                    </div>
                    <div className="program-details">
                      <div className="program-event" style={{ color: palette.text }}>
                        {item.event}
                      </div>
                      {item.description && (
                        <div
                          className="program-description"
                          style={{ color: palette.text }}
                        >
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Notes */}
            <div
              className="program-notes"
              style={{
                backgroundColor: palette.secondary,
                borderColor: palette.primary,
                color: palette.text,
              }}
            >
              <h3 style={{ color: palette.primary }}>Notes</h3>
              <ul>
                <li>Photography will happen throughout the day</li>
                <li>Please silence your phone during the ceremony</li>
                <li>Restrooms are located near the main pavilion</li>
                <li>
                  Dietary accommodations: Please let us know in advance if you have any
                  allergies or restrictions
                </li>
                <li>Have fun and celebrate with us! 💕</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
