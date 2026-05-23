import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useMotionValueEvent, useScroll } from "motion/react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { CashDemo, CouponsDemo, SalesDemo, StockDemo } from "./demos"
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
        <div className="flex flex-col">
            <div
                className={`
          flex w-screen
          bg-background overflow-y-hidden
          ${scrolled
                        ? 'sticky top-0 h-20 px-8 items-center justify-between'
                        : 'h-screen items-center justify-center flex-col'}
          transition-[height, opacity] duration-700 ease-in-out z-10
        `}
            >
                {!scrolled && (
                    <div className='absolute border-border border-1 rounded-lg px-4 py-2 top-8 right-8 flex items-center gap-8'>
                        <div className='flex flex-col self-center items-center'>
                            <span>prefere outro tema?</span>
                            <span>clique neste botão</span>
                        </div>
                        <ArrowRight />
                        <ModeToggle />
                    </div>
                )}
                <h1
                    className={`
            font-bold uppercase
            ${scrolled ? 'text-4xl' : 'text-8xl'}
            transition-all duration-700 ease-in-out
          `}
                >
                    Comercium
                </h1>
                <h2 className={`w-1/2 mt-2 text-center text-2xl font-bold transition-all duration-300 ease-in-out ${scrolled ? "opacity-0 max-h-0 max-w-0 overflow-hidden" : "opacity-100"}`}>o mais intuitivo e simples sistema para gerenciamento de vendas, controle de caixa e estoque e emissão de notas</h2>
                {!scrolled && (
                    <Button
                        className={`${!scrolled && 'mt-4'} px-8 py-6 text-xl font-black hover:cursor-pointer`}
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
                            className="px-8 py-6 text-xl font-black hover:cursor-pointer"
                        >
                            <Link to="/register">
                                iniciar período de testes
                            </Link>
                        </Button>
                    }
                    {!scrolled &&
                        <div className='flex flex-col mt-4 gap-2'>
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
            <main className={`relative opacity-0 z-0 w-full px-12
                ${scrolled
                    ? 'opacity-100'
                    : ''
                }
                transition-all duration-700 ease-in-out
                `}>
                <div className='h-screen' />
                <div ref={mainRef} className="relative min-h-[calc(100vh-6rem)] max-h-screen w-full flex flex-col items-center">
                    <div className='w-full h-full gap-8 flex justify-between'>
                        <div className='w-full flex flex-col gap-4 self-start'>
                            <h2 className="text-8xl">
                                vantagens
                            </h2>
                            <p className="text-2xl">dá uma olhada no que o Comercium tem a oferecer</p>
                            <ul className='text-justify flex flex-col gap-6'>
                                {advantages.map((a) => (
                                    <li className='list-disc' key={a.title}>
                                        <h4 className='font-bold text-xl'>{a.title}</h4>
                                        <p dangerouslySetInnerHTML={{ __html: a.description }} />
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className='flex flex-col text-end gap-8'>
                            <Pricing />
                            <h2 className='text-8xl'>planos</h2>
                            <p className="text-xl">vendedor ambulante? dono de loja? CEO de supermercado? aqui nós atendemos praticamente <strong>qualquer demanda</strong>.</p>
                            <p className="text-xl">além disso, também oferecemos <strong>30 dias de acesso grátis</strong> ao plano controle para você testar.</p>
                        </div>
                    </div>
                    <div className='absolute bottom-2 flex gap-4'>
                        <ArrowDown className='animate-bounce' />
                        <span className='font-bold animate-bounce'>ainda não te convenci? que tal uma demonstração de como é utilizar o Comercium?</span>
                        <ArrowDown className='animate-bounce' />
                    </div>
                </div>
                <div className='h-24' />
                <div className="relative h-[calc(100vh-6rem)] w-full flex flex-col items-end">
                    <div className='w-full pb-4 flex items-center justify-between'>
                        <div>
                            <h2 className="text-8xl">
                                funcionalidades
                            </h2>
                            <p className="p-4 text-xl">tudo nesta seção representa a experiência real do Comercium.</p>
                        </div>
                    </div>
                    <div className='border-1 border-border p-4 w-full flex justify-center h-3/4 rouded-lg'>
                        <Tabs defaultValue='sales' className='w-full flex items-center justify-center'>
                            <TabsList className='gap-8'>
                                <TabsTrigger value='sales'>vendas</TabsTrigger>
                                <TabsTrigger value='stock'>estoque</TabsTrigger>
                                <TabsTrigger value='cash'>caixas</TabsTrigger>
                                <TabsTrigger value='coupons'>notas</TabsTrigger>
                            </TabsList>
                            <TabsContent className='w-full overflow-auto' value='sales'><SalesDemo /></TabsContent>
                            <TabsContent className='w-full overflow-auto' value='stock'><StockDemo /></TabsContent>
                            <TabsContent className='w-full overflow-auto' value='cash'><CashDemo /></TabsContent>
                            <TabsContent className='w-full overflow-auto' value='coupons'><CouponsDemo /></TabsContent>

                        </Tabs>
                    </div>
                </div>
            </main>
        </div>
    );
}
