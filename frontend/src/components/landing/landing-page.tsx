import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useMotionValueEvent, useScroll } from "motion/react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { CashDemo, DashboardDemo, PdvDemo, StockDemo } from "./demos"
import { ModeToggle } from '../theme-toggle';
import { ArrowDown, ArrowRight } from 'lucide-react';
import Pricing from './pricing';
import { Link } from '@tanstack/react-router';

const advantages = [
    {
        title: "interface limpa e moderna",
        description: "o Comercium utiliza componentes limpos, cores neutras e elementos modernos e minimalistas em sua interface."
    },
    {
        title: "sistema intuitivo e de fácil uso",
        description: "a interface é <strong>altamente intuitiva</strong>, não sendo necessário ter grandes conhecimentos de informática para seu uso."
    },
    {
        title: "emissão nativa de NFC-e",
        description: "é possível <strong>emitir NFC-e válida diretamente pelo Comercium</strong>, sem nenhuma interferência externa."
    },
    {
        title: "baixo custo de manutenção",
        description: "o Comercium funciona por mensalidades de acordo com o módulo escolhido. pague de acordo com as funcionalidades que for usar."
    },
    {
        title: "suporte ativo",
        description: "nosso suporte funciona durante todo o horário comercial, <strong>sete dias por semana</strong>. prontos para te ajudar em qualquer ocasião."
    },
    {
        title: "documentação bem escrita",
        description: "tem dúvida em algum módulo do sistema? provavelmente a nossa central de ajuda tem a resposta."
    },
]

export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);
    const { scrollY } = useScroll()
    const lastY = useRef(0)
    const triggered = useRef(false)
    const mainRef = useRef<HTMLDivElement>(null)

    useMotionValueEvent(scrollY, "change", (y: any) => {
        const goingDown = y > lastY.current
        const goingUp = y < lastY.current

        if (goingDown && !scrolled && y > 30) {
            triggered.current = true
            setScrolled(true)
            window.scrollTo({
                top: window.innerHeight,
                behavior: 'smooth'
            })
        }

        if (goingUp && scrolled && y < window.innerHeight * 0.4) {
            triggered.current = false
            setScrolled(false)
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            })
        }

        lastY.current = y
    })


    return (
        <div className="flex w-full min-w-0 flex-col">
            <div
                className={`
          flex w-full
          bg-background overflow-y-hidden
          ${scrolled
                        ? 'sticky top-0 h-16 gap-2 px-4 items-center justify-between md:h-20 md:px-8'
                        : 'h-svh px-4 items-center justify-center flex-col'}
          transition-[height, opacity] duration-700 ease-in-out z-10
        `}
            >
                {!scrolled && (
                    <div className='absolute top-4 right-4 flex items-center gap-8 rounded-lg sm:top-8 sm:right-8 sm:border-1 sm:border-border sm:px-4 sm:py-2'>
                        <div className='hidden flex-col items-center self-center sm:flex'>
                            <span>prefere outro tema?</span>
                            <span>clique neste botão</span>
                        </div>
                        <ArrowRight className='hidden sm:block' />
                        <ModeToggle />
                    </div>
                )}
                <h1
                    className={`
            font-bold uppercase
            ${scrolled ? 'text-2xl md:text-4xl' : 'text-5xl sm:text-7xl lg:text-8xl'}
            transition-all duration-700 ease-in-out
          `}
                >
                    Comercium
                </h1>
                <h2 className={`w-full md:w-1/2 mt-2 text-center text-lg md:text-2xl font-bold transition-all duration-300 ease-in-out ${scrolled ? "opacity-0 max-h-0 max-w-0 overflow-hidden" : "opacity-100"}`}>o mais intuitivo e simples sistema para gerenciamento de vendas, controle de caixa e estoque e emissão de notas</h2>
                {!scrolled && (
                    <Button
                        className={`${!scrolled && 'mt-4'} px-6 py-5 text-lg md:px-8 md:py-6 md:text-xl font-black hover:cursor-pointer`}
                        onClick={() => {
                            triggered.current = true
                            setScrolled(true)
                            window.scrollTo({
                                top: window.innerHeight,
                                behavior: 'smooth'
                            })
                        }}
                    >
                        ver mais detalhes
                    </Button>
                )}
                <div className='flex items-center'>
                    {scrolled &&
                        <Button
                            variant="default"
                            asChild
                            className="px-3 text-sm font-black hover:cursor-pointer md:px-8 md:py-6 md:text-xl"
                        >
                            <Link to="/register">
                                <span className="sm:hidden">testar grátis</span>
                                <span className="hidden sm:inline">iniciar período de testes</span>
                            </Link>
                        </Button>
                    }
                    {!scrolled &&
                        <div className='flex flex-col mt-4 gap-2 items-center'>
                            <span>já possui conta?</span>
                            <Button variant="default" asChild>
                                <Link to="/login">
                                    login
                                </Link>
                            </Button>
                        </div>
                    }
                </div>
            </div>
            <main className={`relative opacity-0 z-0 w-full px-4 md:px-12
                ${scrolled
                    ? 'opacity-100'
                    : ''
                }
                transition-all duration-700 ease-in-out
                `}>
                <div className='h-svh' />
                <div ref={mainRef} className="relative w-full flex flex-col items-center lg:min-h-[calc(100vh-6rem)] lg:max-h-screen">
                    <div className='w-full h-full gap-8 flex flex-col justify-between lg:flex-row'>
                        <div className='flex w-full min-w-0 flex-col gap-4 self-start'>
                            <h2 className="text-4xl wrap-break-word sm:text-5xl md:text-7xl lg:text-8xl">
                                vantagens
                            </h2>
                            <p className="text-lg md:text-2xl">dá uma olhada no que o Comercium tem a oferecer</p>
                            <ul className='flex flex-col gap-6 pl-5 md:text-justify'>
                                {advantages.map((a) => (
                                    <li className='list-disc' key={a.title}>
                                        <h4 className='font-bold text-xl'>{a.title}</h4>
                                        <p dangerouslySetInnerHTML={{ __html: a.description }} />
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className='flex min-w-0 flex-col gap-6 lg:gap-8 lg:text-end'>
                            <Pricing />
                            <h2 className='text-4xl wrap-break-word sm:text-5xl md:text-7xl lg:text-8xl'>planos</h2>
                            <p className="text-base md:text-xl">vendedor ambulante? dono de loja? CEO de supermercado? aqui nós atendemos praticamente <strong>qualquer demanda</strong>.</p>
                            <p className="text-base md:text-xl">além disso, também oferecemos <strong>30 dias de acesso grátis</strong> ao plano controle para você testar.</p>
                        </div>
                    </div>
                    <div className='mt-10 flex items-center gap-4 text-center lg:absolute lg:bottom-2 lg:mt-0'>
                        <ArrowDown className='hidden shrink-0 animate-bounce sm:block' />
                        <span className='font-bold animate-bounce'>ainda não te convenci? que tal uma demonstração de como é utilizar o Comercium?</span>
                        <ArrowDown className='hidden shrink-0 animate-bounce sm:block' />
                    </div>
                </div>
                <div className='h-24' />
                <div className="relative w-full flex flex-col items-end pb-8 lg:h-[calc(100vh-6rem)] lg:pb-0">
                    <div className='w-full pb-4 flex items-center justify-between'>
                        <div>
                            <h2 className="text-4xl wrap-break-word sm:text-5xl md:text-7xl lg:text-8xl">
                                funcionalidades
                            </h2>
                            <p className="py-4 text-base md:p-4 md:text-xl">tudo nesta seção representa a experiência real do Comercium.</p>
                        </div>
                    </div>
                    <div className='border-1 border-border p-2 w-full flex justify-center rounded-lg md:p-4 lg:h-3/4'>
<Tabs defaultValue='dashboard' className='w-full flex items-center justify-center'>
                            <TabsList className='max-w-full justify-start gap-2 overflow-x-auto md:gap-8'>
                                <TabsTrigger value='dashboard'>dashboard</TabsTrigger>
                                <TabsTrigger value='pdv'>ponto de venda</TabsTrigger>
                                <TabsTrigger value='estoque'>estoque</TabsTrigger>
                                <TabsTrigger value='caixas'>caixas</TabsTrigger>
                            </TabsList>
                            <TabsContent className='w-full overflow-auto' value='dashboard'><DashboardDemo /></TabsContent>
                            <TabsContent className='w-full overflow-auto' value='pdv'><PdvDemo /></TabsContent>
                            <TabsContent className='w-full overflow-auto' value='estoque'><StockDemo /></TabsContent>
                            <TabsContent className='w-full overflow-auto' value='caixas'><CashDemo /></TabsContent>
                        </Tabs>
                    </div>
                </div>
            </main>
        </div>
    );
}
