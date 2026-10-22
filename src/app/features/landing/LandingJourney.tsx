import { ArrowUpRight, BookOpen, Heart, MousePointer2 } from "lucide-react";

const readingMascot = new URL("../../../../assets/pinwi-reading-v1.png", import.meta.url).href;
const steps = [
  { title: "Ese lugar que te llama", text: "Recorre las fotos y descubre un espacio donde te imagines estudiando o trabajando.", Icon: MousePointer2 },
  { title: "De la foto a los detalles", text: "Entra a tu cuenta para consultar su dirección, horarios y servicios.", Icon: BookOpen },
  { title: "Guárdalo para tu próximo plan", text: "Agrega tus favoritos y vuelve a ellos cuando necesites un cambio de aire.", Icon: Heart },
];

export function LandingJourney() {
  return <>
    <section id="como-funciona" className="landing-how" aria-labelledby="landing-how-heading">
      <div className="landing-container">
        <div className="landing-how-heading" data-landing-from="left">
          <p className="landing-eyebrow">DE LA IDEA AL LUGAR</p>
          <h2 id="landing-how-heading">Un lugar que te guste.<br /><span>Un día que fluya.</span></h2>
          <p>Explora a tu ritmo. Cuando encuentres ese espacio, te ayudamos a dar el siguiente paso.</p>
          <a className="landing-inline-link" href="#espacios">Quiero descubrirlo<ArrowUpRight size={18} aria-hidden="true" /></a>
        </div>
        <ol className="landing-steps">
          {steps.map(({ title, text, Icon }, index) => <li key={title} data-landing-from={index === 1 ? "right" : "bottom"}>
            <span className="landing-step-number" aria-hidden="true">0{index + 1}</span>
            <div><h3>{title}</h3><p>{text}</p></div>
            <Icon className="landing-step-icon" size={23} strokeWidth={1.5} aria-hidden="true" />
          </li>)}
        </ol>
      </div>
    </section>
    <section id="objetivo" className="landing-container landing-purpose" aria-labelledby="landing-purpose-heading">
      <div className="landing-purpose-art" data-landing-from="left">
        <div className="landing-mascot-scene" aria-hidden="true"><img src={readingMascot} alt="" width={1254} height={1254} loading="lazy" decoding="async" /></div>
        <p>Un ratito para ti.<br /><span>Un lugar para tus ideas.</span></p>
      </div>
      <div className="landing-purpose-copy" data-landing-from="right">
        <p className="landing-eyebrow">HOLA, SOMOS PINWI</p>
        <h2 id="landing-purpose-heading">Lo que haces importa.<br /><span>Dónde lo haces, también.</span></h2>
        <p>Una biblioteca para concentrarte. Un café para cambiar de aire. Una mesa para empezar ese proyecto que llevas tiempo pensando.</p>
        <p>Pinwi nace para acercar esos espacios a estudiantes y trabajadores. Reunimos lugares para que encontrar dónde avanzar sea una parte más simple de tu día.</p>
        <a className="landing-inline-link" href="#espacios">Encuentra ese lugar<ArrowUpRight size={18} aria-hidden="true" /></a>
      </div>
    </section>
  </>;
}
