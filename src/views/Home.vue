<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Droplets,
  Facebook,
  Factory,
  Gauge,
  Headphones,
  Instagram,
  MapPin,
  Menu,
  ShieldCheck,
  Sparkles,
  Waves,
  X
} from 'lucide-vue-next'
import { track } from '../tracking'

const menu = ref(false),
  scrolled = ref(false),
  sent = ref(false),
  activeFaq = ref(0),
  scrollPosition = ref(0),
  scrollProgress = ref(0)
const form = ref({
  name: '',
  email: '',
  phone: '',
  city: 'Cuiabá',
  size: 'Média',
  timeline: '30 Dias',
  message: ''
})
const dropSpeeds = [0.22, 0.36, 0.18, 0.48, 0.3, 0.56, 0.25, 0.42, 0.16, 0.52]
const dropStarts = [80, 410, 690, 220, 540, 30, 770, 330, 610, 150]
const dropLeft = [4, 15, 27, 39, 51, 63, 74, 84, 92, 97]
const dropStyle = (index) => {
  const viewport = typeof window === 'undefined' ? 900 : window.innerHeight
  const y = ((scrollPosition.value * dropSpeeds[index] + dropStarts[index]) % (viewport + 180)) - 90
  return {
    left: `${dropLeft[index]}%`,
    transform: `translate3d(0, ${y}px, 0)`,
    '--drop-delay': `${index * -0.7}s`
  }
}
const onScroll = () => {
  scrolled.value = scrollY > 30
  scrollPosition.value = scrollY
  const scrollable = document.documentElement.scrollHeight - innerHeight
  scrollProgress.value = scrollable > 0 ? Math.min(scrollY / scrollable, 1) : 0
}
onMounted(() => {
  addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})
onUnmounted(() => removeEventListener('scroll', onScroll))
const wa = '5565992510338'
function whatsapp(label = 'whatsapp_click') {
  track(label)
  window.open(
    `https://wa.me/${wa}?text=${encodeURIComponent('Olá! Vi o site da Aguazul e gostaria de um orçamento.')}`,
    '_blank'
  )
}
async function submit() {
  await track('form_submit', form.value)
  sent.value = true
  setTimeout(() => whatsapp('whatsapp_after_form'), 700)
}
const faqs = [
  [
    'Quanto custa uma piscina de fibra?',
    'O valor varia conforme tamanho, modelo e opcionais. Com fabricação própria, entregamos excelente custo-benefício e uma proposta personalizada para seu espaço.'
  ],
  [
    'A instalação completa está inclusa?',
    'O pacote padrão inclui entrega do casco, escavação, nivelamento da base e montagem completa da casa de máquinas e sistema de filtragem.'
  ],
  [
    'Vocês fazem a escavação do terreno?',
    'Sim. Nossa equipe realiza a escavação técnica, prepara e nivela a base para o assentamento seguro do casco.'
  ],
  [
    'Qual é o prazo médio de instalação?',
    'Em geral, de 7 a 15 dias úteis, variando conforme o modelo, clima e condições do solo.'
  ],
  [
    'Atendem o interior de Mato Grosso?',
    'Sim. Atendemos Cuiabá, Várzea Grande, Chapada, Rondonópolis, Primavera, Sorriso, Sinop, Lucas do Rio Verde e outras cidades do estado.'
  ]
]
</script>

<template>
  <div class="site">
    <div class="scroll-water" aria-hidden="true">
      <span
        v-for="(_, index) in dropSpeeds"
        :key="index"
        class="scroll-drop"
        :class="`scroll-drop-${index + 1}`"
        :style="dropStyle(index)"
      ></span>
      <div class="water-progress">
        <i :style="{ height: `${scrollProgress * 100}%` }"></i>
        <b :style="{ top: `${scrollProgress * 100}%` }"></b>
      </div>
    </div>
    <header :class="{ scrolled }">
      <a class="brand" href="#inicio"
        ><img src="/images/agua-azul-premium-logo-transparent.png" alt="Agua Azul Premium"
      /></a>
      <nav :class="{ open: menu }">
        <a href="#experiencia" @click="menu = false">Experiência</a
        ><a href="#projetos" @click="menu = false">Projetos</a
        ><a href="#processo" @click="menu = false">Processo</a
        ><a href="#faq" @click="menu = false">Dúvidas</a>
      </nav>
      <button class="nav-cta" @click="whatsapp()">
        Criar meu projeto <ArrowUpRight :size="17" /></button
      ><button class="menu" @click="menu = !menu"><X v-if="menu" /><Menu v-else /></button>
    </header>

    <main>
      <section id="inicio" class="hero">
        <div class="aqua-background" aria-hidden="true">
          <div class="light-beam light-beam-one"></div>
          <div class="light-beam light-beam-two"></div>
          <div class="water-ripple ripple-one"></div>
          <div class="water-ripple ripple-two"></div>
          <span v-for="bubble in 12" :key="bubble" :class="`bubble bubble-${bubble}`"></span>
        </div>
        <div class="orb orb-a"></div>
        <div class="orb orb-b"></div>
        <div class="grid3d"></div>
        <div class="hero-copy reveal">
          <p class="eyebrow"><span></span> Exclusividade à beira d'água</p>
          <h1>Seu novo lugar<br />favorito <em>em casa.</em></h1>
          <p class="lead">
            Piscinas com fabricação própria, projeto completo e instalação especializada em Cuiabá e
            todo Mato Grosso.
          </p>
          <div class="actions">
            <button class="primary" @click="whatsapp()">Quero viver isso <ArrowUpRight /></button
            ><a href="#projetos" class="text-link">Explorar projetos <span>↓</span></a>
          </div>
          <div class="proof">
            <div>
              <b>38+</b><small>anos criando<br />momentos</small>
            </div>
            <div>
              <b>10k+</b><small>piscinas<br />entregues</small>
            </div>
            <div>
              <b>100%</b><small>equipe<br />própria</small>
            </div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="photo-card">
            <img src="/images/hero.jpeg" alt="Piscina Aguazul instalada" />
            <div class="glow"></div>
            <div class="float-card">
              <span class="pulse"></span>
              <div><small>Projeto completo</small><b>Da ideia ao mergulho</b></div>
            </div>
          </div>
          <div class="ring"><span>AGUAZUL • DESDE 1985 • </span></div>
        </div>
      </section>

      <section id="experiencia" class="manifest">
        <p class="section-index">01 — A EXPERIÊNCIA</p>
        <h2>Mais que uma piscina.<br /><i>Um novo ritmo para a vida.</i></h2>
        <div class="manifest-grid">
          <p>
            A gente cuida de cada detalhe — projeto, escavação, hidráulica, elétrica e acabamento —
            para você cuidar apenas do que importa: aproveitar.
          </p>
          <div class="feature-list">
            <article>
              <ShieldCheck />
              <div>
                <b>Casco ultra reforçado</b
                ><small>Fibra de alta densidade e proteção Gel Coat premium.</small>
              </div>
            </article>
            <article>
              <Factory />
              <div>
                <b>Fabricação própria</b><small>Controle absoluto do início ao acabamento.</small>
              </div>
            </article>
            <article>
              <Headphones />
              <div>
                <b>Suporte que continua</b
                ><small>Especialistas antes, durante e depois da instalação.</small>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="projetos" class="projects">
        <div class="section-head">
          <div>
            <p class="section-index">02 — INSPIRAÇÕES</p>
            <h2>Escolha o cenário<br />dos seus <i>melhores dias.</i></h2>
          </div>
          <button class="outline" @click="whatsapp()">Ver todos os modelos <ArrowUpRight /></button>
        </div>
        <div class="gallery">
          <article class="project large">
            <img src="/images/modern.jpeg" />
            <div class="shade"></div>
            <span>01</span>
            <div>
              <small>Linhas contemporâneas</small>
              <h3>Premium Concept</h3>
            </div>
          </article>
          <article class="project">
            <img src="/images/gourmet.jpeg" />
            <div class="shade"></div>
            <span>02</span>
            <div>
              <small>Espaços inteligentes</small>
              <h3>Gourmet Integrado</h3>
            </div>
          </article>
          <article class="project">
            <img src="/images/family.jpeg" />
            <div class="shade"></div>
            <span>03</span>
            <div>
              <small>Para toda a família</small>
              <h3>Family Classic</h3>
            </div>
          </article>
        </div>
      </section>

      <section id="processo" class="process">
        <div class="watermark">FLUIR</div>
        <p class="section-index">03 — SEM COMPLICAÇÃO</p>
        <h2>Da primeira conversa<br />ao <i>primeiro mergulho.</i></h2>
        <div class="steps">
          <article>
            <b>01</b><Droplets />
            <h3>Entender</h3>
            <p>Conhecemos seu espaço, sua rotina e seus planos.</p>
          </article>
          <article>
            <b>02</b><Sparkles />
            <h3>Projetar</h3>
            <p>Indicamos modelo, posição e opcionais sob medida.</p>
          </article>
          <article>
            <b>03</b><Gauge />
            <h3>Construir</h3>
            <p>Equipe própria executa uma obra rápida e organizada.</p>
          </article>
          <article>
            <b>04</b><Waves />
            <h3>Viver</h3>
            <p>Entregamos tudo pronto para criar novas memórias.</p>
          </article>
        </div>
      </section>

      <section class="quote-section">
        <div class="quote-copy">
          <p class="section-index">04 — COMECE AGORA</p>
          <h2>Seu quintal está a uma<br />conversa de <i>mudar.</i></h2>
          <p>
            Conte um pouco sobre o que você imagina. Nosso especialista prepara uma orientação
            personalizada, sem compromisso.
          </p>
          <ul>
            <li><Check /> Consultoria técnica inclusa</li>
            <li><Check /> Proposta personalizada sem custo</li>
            <li><Check /> Condições facilitadas em até 12x</li>
          </ul>
        </div>
        <form @submit.prevent="submit">
          <div v-if="sent" class="success">
            <div>✓</div>
            <h3>Recebemos seu pedido!</h3>
            <p>Vamos abrir o WhatsApp para continuar seu atendimento.</p>
          </div>
          <template v-else
            ><label
              >Como podemos chamar você?<input
                v-model="form.name"
                required
                placeholder="Seu nome completo"
            /></label>
            <div class="row">
              <label
                >Seu WhatsApp<input
                  v-model="form.phone"
                  required
                  placeholder="(65) 99999-9999" /></label
              ><label>Sua cidade<input v-model="form.city" required /></label>
            </div>
            <div class="row">
              <label
                >Tamanho desejado<select v-model="form.size">
                  <option>Compacta</option>
                  <option>Média</option>
                  <option>Grande</option>
                </select></label
              ><label
                >Quando quer instalar?<select v-model="form.timeline">
                  <option>Imediato</option>
                  <option>30 Dias</option>
                  <option>90 Dias</option>
                  <option>Apenas pesquisando</option>
                </select></label
              >
            </div>
            <label
              >Conte sua ideia
              <textarea
                v-model="form.message"
                placeholder="O que você imagina para o seu espaço?"
              ></textarea></label
            ><button class="primary full">Receber meu orçamento <ArrowUpRight /></button
            ><small class="privacy"
              >Seus dados ficam seguros e serão usados apenas para seu atendimento.</small
            ></template
          >
        </form>
      </section>

      <section id="faq" class="faq">
        <div>
          <p class="section-index">05 — DÚVIDAS</p>
          <h2>Tudo claro<br />antes de <i>começar.</i></h2>
          <p>Ainda ficou alguma dúvida? Fale diretamente com nosso time.</p>
          <button class="outline" @click="whatsapp()">Conversar no WhatsApp</button>
        </div>
        <div class="accordion">
          <article
            v-for="(faq, i) in faqs"
            :key="faq[0]"
            :class="{ active: activeFaq === i }"
            @click="activeFaq = activeFaq === i ? -1 : i"
          >
            <header>
              <b>0{{ i + 1 }}</b>
              <h3>{{ faq[0] }}</h3>
              <ChevronDown />
            </header>
            <p>{{ faq[1] }}</p>
          </article>
        </div>
      </section>
    </main>
    <footer>
      <img src="/images/agua-azul-premium-logo-transparent.png" alt="Agua Azul Premium" />
      <div>
        <b>Showroom Cuiabá</b>
        <a
          class="map-link"
          href="https://maps.google.com/maps/place//data=!4m2!3m1!1s0x939db3091a2427ff:0xefec593933cea2ab?entry=s&amp;sa=X&amp;ved=2ahUKEwj3mf_TsLyWAxXArpUCHclvJQgQ4kB6BAgWEAA&amp;hl=pt"
          target="_blank"
          rel="noopener noreferrer"
        >
          <MapPin :size="21" />
          <span>Av. Ipiranga, 1007 — Jardim Independência<br />Cuiabá — MT, 78043-050</span>
        </a>
      </div>
      <div>
        <b>Vamos conversar</b>
        <p>
          <a href="https://wa.me/5565992510338" target="_blank" rel="noopener noreferrer"
            >(65) 99251-0338</a
          ><br />aguazulpiscinacuiaba@gmail.com
        </p>
        <p class="social-links">
          <a
            href="https://www.instagram.com/aguazulprem/"
            target="_blank"
            rel="noopener noreferrer"
            ><Instagram :size="20" /> Instagram</a
          >
          <a
            href="https://www.facebook.com/profile.php?id=61593736142081&amp;locale=pt_BR"
            target="_blank"
            rel="noopener noreferrer"
            ><Facebook :size="20" /> Facebook</a
          >
        </p>
      </div>
      <div>
        <b>© 2026 Aguazul Piscinas</b>
        <p>Fabricação própria desde 1985.</p>
      </div>
    </footer>
    <button class="whatsapp" @click="whatsapp()">
      <span>Fale com a gente</span
      ><svg viewBox="0 0 32 32">
        <path
          fill="currentColor"
          d="M19.1 17.2c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-1.8-.9-3-1.6-4.2-3.7-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.6-.5-.9-.5h-.7c-.2 0-.6.1-1 .5-1 1.1-1.5 2.5-1.5 4 0 .4.1 2.8 2.1 5.4 2 2.6 4.5 3.7 7.6 4.8 1.1.3 2.4.2 3.3-.2 1-.4 1.8-1.7 2-2.7.2-.9.2-1.7.1-1.9-.1-.3-.3-.4-.6-.6M16 28.6h-.1c-2.3 0-4.6-.6-6.5-1.8l-.5-.3-4.8 1.3 1.3-4.7-.3-.5A12.4 12.4 0 0 1 3.2 16 12.8 12.8 0 1 1 16 28.6"
        />
      </svg>
    </button>
  </div>
</template>
