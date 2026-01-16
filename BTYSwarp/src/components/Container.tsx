import styled from 'styled-components'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;

  width: 100%;
  padding: 32px 16px;
  min-height: 90vh;

  ${({ theme }) => theme.mediaQueries.lg} {
    padding: 32px 24px;
  }
`

export default Container
