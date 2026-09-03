import type { ReactNode } from "react";
import { motion } from "motion/react";
import {
  ChevronIcon,
  ForgeMark,
  InboxIcon,
  Kbd,
  NoteIcon,
  PlusIcon,
  SearchIcon,
  StatusIcon,
  ViewsIcon,
} from "./icons";
import { bootHidden, enterTransition, shown, staggerDelay, useMotionPreference } from "./motion";

const MOCK_ROWS: Array<{ id: string; status: "inbox" | "planned" | "in_progress" | "done"; title: string }> = [
  { id: "FOR-18", status: "in_progress", title: "Canvas de la campaña Q3" },
  { id: "FOR-12", status: "inbox", title: "Capturar onboarding en la primera sesión" },
  { id: "FOR-8", status: "planned", title: "Atajos de teclado en el detalle" },
  { id: "FOR-3", status: "done", title: "Bandeja con captura rápida" },
];

export function Landing() {
  const reduced = useMotionPreference();
  let i = 0;
  const delay = () => staggerDelay(i++, true, reduced);

  return (
    <div className="landing">
      <div className="landing-atmosphere" aria-hidden />
      <header className="landing-nav">
        <motion.a
          href="/"
          className="landing-brand"
          initial={bootHidden(true, reduced, { y: 8 })}
          animate={shown(reduced)}
          transition={enterTransition(reduced, delay())}
        >
          <ForgeMark size={22} />
          <span>Forge</span>
        </motion.a>
        <motion.a
          href="/app"
          className="primary landing-nav-cta"
          initial={bootHidden(true, reduced, { y: 8 })}
          animate={shown(reduced)}
          transition={enterTransition(reduced, delay())}
        >
          Abrir dashboard
        </motion.a>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <motion.p
            className="landing-kicker"
            initial={bootHidden(true, reduced, { y: 8 })}
            animate={shown(reduced)}
            transition={enterTransition(reduced, delay())}
          >
            Gestor de ideas
          </motion.p>
          <motion.h1
            initial={bootHidden(true, reduced, { y: 8 })}
            animate={shown(reduced)}
            transition={enterTransition(reduced, delay())}
          >
            Captura, ordena y mueve ideas de punta a punta.
          </motion.h1>
          <motion.p
            className="landing-lede"
            initial={bootHidden(true, reduced, { y: 8 })}
            animate={shown(reduced)}
            transition={enterTransition(reduced, delay())}
          >
            Bandeja, estados, canvas y teclado. Sin cuentas: lo que capturas queda en este
            navegador.
          </motion.p>
          <motion.div
            className="landing-hero-actions"
            initial={bootHidden(true, reduced, { y: 8 })}
            animate={shown(reduced)}
            transition={enterTransition(reduced, delay())}
          >
            <a href="/app" className="primary landing-cta">
              Abrir dashboard
            </a>
            <span className="landing-hint">
              Pulsa <Kbd>C</Kbd> al entrar para capturar
            </span>
          </motion.div>
        </section>

        <motion.section
          className="landing-product"
          aria-hidden
          initial={bootHidden(true, reduced, { y: 16 })}
          animate={shown(reduced)}
          transition={enterTransition(reduced, delay())}
        >
          <div className="landing-mock">
            <aside className="landing-mock-side">
              <div className="workspace">
                <ForgeMark />
                <div>
                  <div className="workspace-name">Forge</div>
                </div>
                <span className="workspace-meta">DASH</span>
              </div>
              <div className="nav-search">
                <SearchIcon size={14} />
                <span className="grow">Buscar</span>
                <Kbd>⌘K</Kbd>
              </div>
              <div className="nav-section">
                <div className="nav-item active">
                  <InboxIcon />
                  Bandeja
                  <span className="count">2</span>
                </div>
                <div className="nav-item">
                  <ViewsIcon />
                  Mis ideas
                  <span className="count">3</span>
                </div>
              </div>
            </aside>
            <div className="landing-mock-main">
              <div className="topbar">
                <h1>Mis ideas</h1>
                <span className="spacer" />
                <span className="primary">
                  <PlusIcon size={14} />
                  Nueva idea
                </span>
              </div>
              <div className="quick-capture">
                <PlusIcon size={14} />
                <span className="quick-capture-input">Capturar idea</span>
              </div>
              <div className="landing-mock-list">
                <div className="group-head">
                  <ChevronIcon open />
                  <StatusIcon status="in_progress" />
                  En progreso
                  <span className="n">1</span>
                </div>
                {MOCK_ROWS.slice(0, 1).map((row) => (
                  <MockRow key={row.id} {...row} focused />
                ))}
                <div className="group-head">
                  <ChevronIcon open />
                  <StatusIcon status="inbox" />
                  Bandeja
                  <span className="n">1</span>
                </div>
                {MOCK_ROWS.slice(1).map((row) => (
                  <MockRow key={row.id} {...row} />
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        <section className="landing-features">
          <Feature
            icon={<InboxIcon />}
            title="Captura"
            body="Escribe y entra a la bandeja sin cambiar de pantalla. El compositor vive en la lista."
            hint={
              <>
                <Kbd>C</Kbd> captura
              </>
            }
            reduced={reduced}
            delay={delay()}
          />
          <Feature
            icon={<StatusIcon status="in_progress" />}
            title="Estados"
            body="Bandeja, por hacer, en progreso, completada. Arrastra filas o muévelas con el teclado."
            hint={
              <>
                <Kbd>Alt</Kbd> <Kbd>1–4</Kbd>
              </>
            }
            reduced={reduced}
            delay={delay()}
          />
          <Feature
            icon={<NoteIcon />}
            title="Canvas"
            body="Cuando una idea se vuelve trabajo: notas, imágenes, video y referencias a otras ideas."
            hint="Un tablero por idea"
            reduced={reduced}
            delay={delay()}
          />
          <Feature
            icon={<SearchIcon size={16} />}
            title="Teclado"
            body="Paleta, búsqueda y navegación de filas. Hecho para no soltar las manos."
            hint={
              <>
                <Kbd>⌘K</Kbd> <Kbd>J</Kbd> <Kbd>K</Kbd> <Kbd>/</Kbd>
              </>
            }
            reduced={reduced}
            delay={delay()}
          />
        </section>

        <motion.section
          className="landing-close"
          initial={bootHidden(true, reduced, { y: 8 })}
          animate={shown(reduced)}
          transition={enterTransition(reduced, delay())}
        >
          <h2>Entra y captura la primera.</h2>
          <p>El dashboard es la bandeja. La landing se queda aquí para cuando quieras volver.</p>
          <a href="/app" className="primary landing-cta">
            Abrir dashboard
          </a>
        </motion.section>
      </main>
    </div>
  );
}

function MockRow({
  id,
  status,
  title,
  focused = false,
}: {
  id: string;
  status: "inbox" | "planned" | "in_progress" | "done";
  title: string;
  focused?: boolean;
}) {
  return (
    <div className={`row landing-mock-row${focused ? " focused" : ""}`}>
      <span className="ident">{id}</span>
      <span className="status-btn">
        <StatusIcon status={status} />
      </span>
      <span className="title">{title}</span>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
  hint,
  reduced,
  delay,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  hint: ReactNode;
  reduced: boolean;
  delay: number;
}) {
  return (
    <motion.article
      className="landing-feature"
      initial={bootHidden(true, reduced, { y: 8 })}
      animate={shown(reduced)}
      transition={enterTransition(reduced, delay)}
    >
      <div className="landing-feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      <div className="landing-feature-hint">{hint}</div>
    </motion.article>
  );
}
