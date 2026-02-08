// Photo Upload + Guestbook stub
export default function Upload() {
  return (
    <main>
      <h2>Upload Your Photo</h2>
      <form>
        <input placeholder="Your Name (optional)" />
        <input placeholder="Family Name / Nickname (optional)" />
        <textarea placeholder="Caption" />
        <input type="file" />
        <button type="submit">Upload</button>
      </form>
    </main>
  );
}
