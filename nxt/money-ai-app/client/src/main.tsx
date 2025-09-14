import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'


function RazorpayButton() {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const handlePayment = () => {
    const options = {
      key: 'rzp_test_1gQdsGq0gzNDmo', // Replace with your Razorpay Key ID
      amount: 50000, // Amount in paise (e.g., ₹500)
      currency: 'INR',
      name: 'Demo Payment',
      description: 'Test Transaction',
      handler: function (response: any) {
        alert('Payment Successful! Payment ID: ' + response.razorpay_payment_id)
      },
      prefill: {
        name: 'Likhith Imandi',
        email: 'ilikhith2007@gmail.com',
        contact: '7981237980'
      },
      theme: {
        color: '#3399cc'
      }
    }
    // @ts-ignore
    const rzp = new window.Razorpay(options)
    rzp.open()
  }

  return <button onClick={handlePayment}>Pay with Razorpay</button>
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <RazorpayButton />
  </StrictMode>,
)