import { useEffect } from 'react'

const useGetDocumentTitlePrice = () => {
  // 私有链2999没有CAKE代币，直接设置标题
  useEffect(() => {
    document.title = `BTY Chain DEX`
  }, [])
}
export default useGetDocumentTitlePrice
