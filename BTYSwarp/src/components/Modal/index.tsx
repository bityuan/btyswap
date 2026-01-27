import React from 'react'
import styled, { css } from 'styled-components'
import { animated, useTransition } from 'react-spring'
import { DialogOverlay, DialogContent } from '@reach/dialog'
import { isMobile } from 'react-device-detect'
import '@reach/dialog/styles.css'
import { transparentize } from 'polished'

// No-op function to prevent backdrop clicks when disabled
const noop = () => {
  // Intentionally empty to prevent backdrop dismiss
}

const AnimatedDialogOverlay = animated(DialogOverlay)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const StyledDialogOverlay = styled(AnimatedDialogOverlay).withConfig({
  shouldForwardProp: (prop: string | number) => String(prop) !== 'isFullscreen',
})<{ isFullscreen?: boolean }>`
  &[data-reach-dialog-overlay] {
    z-index: 50;
    overflow: hidden;

    display: flex;
    align-items: center;
    justify-content: center;

    /* 全屏模式下背景色与内容一致，非全屏模式显示半透明遮罩 */
    background-color: ${({ isFullscreen, theme }) => 
      isFullscreen ? theme.colors.invertedContrast : 'rgba(0, 0, 0, 0.3)'};
  }
`

const AnimatedDialogContent = animated(DialogContent)
// destructure to not pass custom props to Dialog DOM element
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const StyledDialogContent = styled(({ minHeight, maxHeight, mobile, isOpen, ...rest }) => (
  <AnimatedDialogContent {...rest} />
)).attrs({
  'aria-label': 'dialog',
})<{ minHeight?: number | false; maxHeight?: number; mobile: boolean }>`
  &[data-reach-dialog-content] {
    margin: 0 0 2rem 0;
    margin-bottom: 80px;
    border: 1px solid ${({ theme }) => theme.colors.invertedContrast};
    background-color: ${({ theme }) => theme.colors.invertedContrast};
    box-shadow: 0 4px 8px 0 ${transparentize(0.95, '#191326')};
    padding: 0px;
    width: 80%;
    overflow: hidden;

    align-self: ${({ mobile }) => (mobile ? 'flex-end' : 'center')};

    max-width: 420px;
    ${({ maxHeight }) =>
      maxHeight &&
      css`
        max-height: ${maxHeight}vh;
      `}
    ${({ minHeight }) =>
      minHeight &&
      css`
        min-height: ${minHeight}vh;
      `}
    display: flex;
    border-radius: 20px;

    ${({ theme }) => theme.mediaQueries.lg} {
      width: 65vw;
    }
    ${({ theme }) => theme.mediaQueries.sm} {
      width: 85vw;
    }
    
    /* 全屏模式 */
    ${({ minHeight, maxHeight }) =>
      minHeight === 100 && maxHeight === 100 &&
      css`
        width: 100vw;
        height: 100vh;
        max-width: 100vw;
        max-height: 100vh;
        margin: 0;
        border-radius: 0;
        border: none;
        align-self: stretch;
      `}
  }
`

interface ModalProps {
  isOpen: boolean
  onDismiss: () => void
  minHeight?: number | false
  maxHeight?: number
  initialFocusRef?: React.RefObject<any>
  children?: React.ReactNode
  disableBackdropClick?: boolean
}

export default function Modal({
  isOpen,
  onDismiss,
  minHeight = false,
  maxHeight = 50,
  initialFocusRef,
  children,
  disableBackdropClick = false,
}: ModalProps) {
  const fadeTransition = useTransition(isOpen, null, {
    config: { duration: 200 },
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0 },
  })

  const isFullscreen = minHeight === 100 && maxHeight === 100

  return (
    <>
      {fadeTransition.map(
        ({ item, key, props }) =>
          item && (
            <StyledDialogOverlay 
              key={key} 
              style={props} 
              onDismiss={disableBackdropClick ? noop : onDismiss} 
              {...(initialFocusRef && { initialFocusRef })}
              isFullscreen={isFullscreen}
            >
              <StyledDialogContent
                aria-label="dialog content"
                minHeight={minHeight}
                maxHeight={maxHeight}
                mobile={isMobile}
              >
                {/* prevents the automatic focusing of inputs on mobile by the reach dialog */}
                {/* eslint-disable */}
                {!initialFocusRef && isMobile ? <div tabIndex={1} /> : null}
                {/* eslint-enable */}
                {children}
              </StyledDialogContent>
            </StyledDialogOverlay>
          )
      )}
    </>
  )
}
