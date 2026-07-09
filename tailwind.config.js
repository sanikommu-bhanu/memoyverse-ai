/** @type {import('tailwindcss').Config} */
module.exports = {
  content:["./app/**/*.{js,ts,jsx,tsx}","./components/**/*.{js,ts,jsx,tsx}"],
  theme:{
    extend:{
      colors:{
        P:"#111111",  W:"#FFFFFF",
        G:"#F5F5F7",  E:"#EAEAEA",
        M:"#6B6B6F",  F:"#9A9A9E"
      },
      borderRadius:{card:"28px",xl2:"20px",xl3:"24px"},
      boxShadow:{
        card:"0 2px 20px rgba(0,0,0,0.06)",
        float:"0 8px 40px rgba(0,0,0,0.14)",
        up:"0 -2px 24px rgba(0,0,0,0.07)"
      },
      fontFamily:{
        sans:["Inter","system-ui","sans-serif"],
        display:["'Playfair Display'","serif"]
      }
    }
  },
  plugins:[]
};
