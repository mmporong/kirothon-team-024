import { useEffect, useState } from 'react';

export function KiroMascot() {
  const [animated, setAnimated] = useState(() => typeof window !== 'undefined' && !(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false));
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => setAnimated(!preference.matches);
    preference.addEventListener('change', changed);
    return () => preference.removeEventListener('change', changed);
  }, []);
  return <figure className="kiro-mascot"><div className="mascot-orbit"><img src={`./kiro/${animated ? 'mascot.gif' : 'mascot-still.png'}`} width={500} height={600} alt="Kiro 캐릭터" /></div><figcaption><span>Kiro</span><button className="motion-toggle" type="button" onClick={() => setAnimated((value) => !value)} aria-pressed={animated} aria-label={animated ? 'Kiro 캐릭터 움직임 끄기' : 'Kiro 캐릭터 움직임 켜기'} title={animated ? '움직임 끄기' : '움직임 켜기'}><span aria-hidden>{animated ? 'Ⅱ' : '▶'}</span></button></figcaption></figure>;
}
