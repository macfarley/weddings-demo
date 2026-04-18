import { render, screen } from '@testing-library/react';
import SiteFooter from '../../components/SiteFooter';
import NavBar from '../../components/NavBar';
import QRCodeFlyer from '../../pages/qrcodeflyer';

// ─── shared palatte mock ────────────────────────────────────────────────────
jest.mock('../../context/PaletteContext', () => ({
  usePalette: () => ({
    palette: {
      primary: '#111111',
      secondary: '#ffffff',
      text: '#222222',
      highlight: '#cccccc',
      background: '#f7f7f7',
    },
  }),
}));

// ─── Next.js mocks ──────────────────────────────────────────────────────────
jest.mock('next/router', () => ({
  useRouter: () => ({ pathname: '/' }),
}));

jest.mock('next/link', () => {
  const Link = ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  );
  Link.displayName = 'MockLink';
  return Link;
});

jest.mock('next/head', () => {
  const Head = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  Head.displayName = 'MockHead';
  return Head;
});

// ─── react-qr-code mock ─────────────────────────────────────────────────────
jest.mock('react-qr-code', () => {
  const QRCode = ({ value }: { value: string }) => (
    <div data-testid="qr-code" data-value={value} />
  );
  QRCode.displayName = 'MockQRCode';
  return QRCode;
});

// ─── SiteFooter ─────────────────────────────────────────────────────────────
describe('SiteFooter', () => {
  it('renders creator heading and SitesbyMac link', () => {
    render(<SiteFooter />);
    expect(screen.getByText(/about the creator/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'SitesbyMac.dev' })).toHaveAttribute(
      'href',
      'https://www.sitesbymac.dev',
    );
  });

  it('renders contact email link', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: /mac@sitesbymac\.dev/i })).toHaveAttribute(
      'href',
      'mailto:Mac@sitesbymac.dev',
    );
  });
});

// ─── NavBar ─────────────────────────────────────────────────────────────────
describe('NavBar', () => {
  it('renders all five navigation links', () => {
    render(<NavBar />);
    expect(screen.getByRole('link', { name: /event program/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /about the couple/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /photo gallery/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign the guestbook/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /send your photos/i })).toBeInTheDocument();
  });

  it('does not render a Home link', () => {
    render(<NavBar />);
    // The brand link says "John & Crystal's Wedding" not a plain "Home" link
    const homeLink = screen.queryByRole('link', { name: /^home$/i });
    expect(homeLink).not.toBeInTheDocument();
  });

  it('applies stoplight variant classes to links', () => {
    render(<NavBar />);
    const programLink = screen.getByRole('link', { name: /event program/i });
    const guestbookLink = screen.getByRole('link', { name: /sign the guestbook/i });
    const galleryLink = screen.getByRole('link', { name: /photo gallery/i });

    expect(programLink.className).toContain('nav-link--red');
    expect(guestbookLink.className).toContain('nav-link--green');
    expect(galleryLink.className).toContain('nav-link--yellow');
  });
});

// ─── QRCodeFlyer ─────────────────────────────────────────────────────────────
describe('QRCodeFlyer', () => {
  beforeEach(() => {
    // Prevent auto-print from running in the test environment
    jest.spyOn(window, 'print').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the QR code pointed at the sendyourphotos URL', () => {
    render(<QRCodeFlyer />);
    const qr = screen.getByTestId('qr-code');
    expect(qr).toBeInTheDocument();
    expect(qr).toHaveAttribute(
      'data-value',
      'https://www.john-and-crystal-may.wedding/sendyourphotos',
    );
  });

  it('renders the share-your-photos heading', () => {
    render(<QRCodeFlyer />);
    expect(screen.getByRole('heading', { name: /share your photos/i })).toBeInTheDocument();
  });

  it('renders the display URL for guests', () => {
    render(<QRCodeFlyer />);
    expect(screen.getByText(/john-and-crystal-may\.wedding/i)).toBeInTheDocument();
  });
});
