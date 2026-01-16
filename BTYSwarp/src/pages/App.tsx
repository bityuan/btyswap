import React, { Suspense } from 'react'
import { HashRouter, Route, Switch } from 'react-router-dom'
import styled from 'styled-components'
import VersionBar from 'components/VersionBar'
import Popups from '../components/Popups'
import Web3ReactManager from '../components/Web3ReactManager'
import { RedirectDuplicateTokenIds, RedirectOldAddLiquidityPathStructure } from './AddLiquidity/redirects'
import { RedirectOldRemoveLiquidityPathStructure } from './RemoveLiquidity/redirects'
import AddLiquidity from './AddLiquidity'
import Pool from './Pool'
import RemoveLiquidity from './RemoveLiquidity'
import Swap from './Swap'
import CreateToken from './CreateToken'

import { RedirectPathToSwapOnly } from './Swap/redirects'
import Menu from '../components/Menu'

const AppWrapper = styled.div`
  display: flex;
  flex-flow: column;
  align-items: center;
  overflow-x: hidden;
  min-height: 100vh;
  width: 100%;
`

const BodyWrapper = styled.div`
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 1;
  margin-bottom: 64px;
  width: 100%;
  max-width: 1200px;
  padding: 0 16px;
  
  ${({ theme }) => theme.mediaQueries.lg} {
    margin-bottom: 0;
    padding: 0 24px;
  }
`

export default function App() {
  return (
    <Suspense fallback={null}>
      <HashRouter>
        <AppWrapper>
          <Menu />
          <BodyWrapper>
            <Popups />
            <Web3ReactManager>
              <Switch>
                <Route exact strict path="/swap" component={Swap} />
                <Route exact strict path="/pool" component={Pool} />
                <Route exact path="/add" component={AddLiquidity} />
                <Route exact strict path="/remove/:currencyIdA/:currencyIdB" component={RemoveLiquidity} />
                <Route exact strict path="/create-token" component={CreateToken} />

                {/* Redirection: These old routes are still used in the code base */}
                <Route exact path="/add/:currencyIdA" component={RedirectOldAddLiquidityPathStructure} />
                <Route exact path="/add/:currencyIdA/:currencyIdB" component={RedirectDuplicateTokenIds} />
                <Route exact strict path="/remove/:tokens" component={RedirectOldRemoveLiquidityPathStructure} />

                <Route component={RedirectPathToSwapOnly} />
              </Switch>
            </Web3ReactManager>
          </BodyWrapper>
          <VersionBar />
        </AppWrapper>
      </HashRouter>
    </Suspense>
  )
}
