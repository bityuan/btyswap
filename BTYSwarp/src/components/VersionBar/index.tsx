import React from 'react'
import styled from 'styled-components'

const Wrapper = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 64px;
  background-color: ${({ theme }) => theme.colors.tertiary};
`

const VersionBar = () => {
  return <Wrapper />
}

export default VersionBar
