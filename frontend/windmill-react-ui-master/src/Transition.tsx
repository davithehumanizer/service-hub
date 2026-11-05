/**
 * https://gist.github.com/adamwathan/e0a791aa0419098a7ece70028b2e641e
 */
import React, { useContext, useEffect, useRef } from 'react'
import { CSSTransition as ReactCSSTransition } from 'react-transition-group'

interface TransitionContext {
  parent: {
    appear?: string
    show?: boolean
    isInitialRender?: boolean
  }
}
const transitionContext = React.createContext<TransitionContext>({
  parent: {},
})

function useIsInitialRender() {
  const isInitialRender = useRef(true)
  useEffect(() => {
    isInitialRender.current = false
  }, [])
  return isInitialRender.current
}

interface TransitionProps {
  children?: React.ReactNode
  show?: boolean
  enter?: string
  enterFrom?: string
  enterTo?: string
  leave?: string
  leaveFrom?: string
  leaveTo?: string
  appear?: string
}

const CSSTransition: React.FC<TransitionProps> = function CSSTransition({
  show,
  enter = '',
  enterFrom = '',
  enterTo = '',
  leave = '',
  leaveFrom = '',
  leaveTo = '',
  appear,
  children,
}) {
  const enterClasses = enter.split(' ').filter((s) => s.length)
  const enterFromClasses = enterFrom.split(' ').filter((s) => s.length)
  const enterToClasses = enterTo.split(' ').filter((s) => s.length)
  const leaveClasses = leave.split(' ').filter((s) => s.length)
  const leaveFromClasses = leaveFrom.split(' ').filter((s) => s.length)
  const leaveToClasses = leaveTo.split(' ').filter((s) => s.length)

  const ref = useRef<HTMLDivElement>(null)
  function addClasses(node: HTMLElement, classes: string[]) {
    classes.length && node.classList.add(...classes)
  }

  function removeClasses(node: HTMLElement, classes: string[]) {
    classes.length && node.classList.remove(...classes)
  }

  return (
    <ReactCSSTransition
      nodeRef={ref}
      appear={appear}
      unmountOnExit
      in={show}
      addEndListener={(done) => {
        ref.current && ref.current.addEventListener('transitionend', done, false)
      }}
      onEnter={() => {
        ref.current && addClasses(ref.current, [...enterClasses, ...enterFromClasses])
      }}
      onEntering={() => {
        ref.current && removeClasses(ref.current, enterFromClasses)
        ref.current && addClasses(ref.current, enterToClasses)
      }}
      onEntered={() => {
        ref.current ? removeClasses(ref.current, [...enterToClasses, ...enterClasses]) : null
      }}
      onExit={() => {
        if (ref.current) {
          addClasses(ref.current, [...leaveClasses, ...leaveFromClasses])
        }
      }}
      onExiting={() => {
        ref.current && removeClasses(ref.current, leaveFromClasses)
        ref.current && addClasses(ref.current, leaveToClasses)
      }}
      onExited={() => {
        ref.current &&
        removeClasses(ref.current, [...leaveToClasses, ...leaveClasses])
      }}
    >
      {children}
    </ReactCSSTransition>
  )
}

const Transition: React.FC<TransitionProps> = function Transition({ show, appear, ...rest }) {
  const { parent } = useContext(transitionContext)
  const isInitialRender = useIsInitialRender()
  const isChild = show === undefined

  if (isChild) {
    return <CSSTransition appear={parent.appear} show={parent.show} {...rest} />
  } else
    return (
      <transitionContext.Provider
        value={{
          parent: {
            show,
            isInitialRender,
            appear,
          },
        }}
      >
        <CSSTransition appear={appear} show={show} {...rest} />
      </transitionContext.Provider>
    )
}

export default Transition
