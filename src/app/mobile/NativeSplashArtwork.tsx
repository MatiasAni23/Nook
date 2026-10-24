import './native-launch.css';

const wordmark = new URL('../../../assets/pinwi-wordmark.svg', import.meta.url).href;

export function NativeSplashArtwork({ leaving = false }: { leaving?: boolean }) {
  return <div className={`native-launch${leaving ? ' is-leaving' : ''}`} role="status" aria-label="Iniciando Pinwi">
    <div className="native-launch-content"><div className="native-launch-character"><img src="/brand/splash-mascot.png" alt="" width={512} height={512} /><span /></div><img className="native-launch-wordmark" src={wordmark} alt="Pinwi" width={1280} height={490} /><p>Un lugar para tus ideas.</p></div>
  </div>;
}
