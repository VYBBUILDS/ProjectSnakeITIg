import dynamic from 'next/dynamic';

const SuperSnake = dynamic(() => import('../components/SuperSnake'), {
  ssr: false,
  loading: () => <div style={{ background: '#0a0e27', width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ecca3', fontSize: '18px' }}>Loading Game...</div>
});

export default function Home() {
  return (
    <>
      <style>{`html, body { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; background: #0a0e27; }`}</style>
      <SuperSnake />
    </>
  );
}
