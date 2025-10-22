export default async function Home() {
  const greeting = await (
    await fetch(`http://${process.env.NEXT_PUBLIC_DOMAIN || "localhost:8787"}`)
  ).text();
  return <p>{greeting}</p>;
}
