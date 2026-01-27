import styled from 'styled-components'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  flex: 1;

  width: 100%;
  padding: 0 5px;
  padding-top: 10px;
  min-height: 90vh;

  ${({ theme }) => theme.mediaQueries.lg} {
    padding: 0 24px;
    padding-top: 20px;
  }
`

export default Container
