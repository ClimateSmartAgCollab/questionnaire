import React from 'react'
import UofG from '../assets/UofG_Cornerstone_wTagline_blk_rgb.png'
import logoG from '../assets/R.jpg'
import logoOntarioG from '../assets/OIP.png'
import { Stack, Divider, Box, Typography } from '@mui/material'


const Footer = () => {
  return (
    <>
      <Divider orientation='horizontal' flexItem />
      <Stack
        direction='column'
        justifyContent='space-between'
        alignItems='right'
        sx={{
          padding: '1rem',
          height: '50%'
        }}
      >
        <Stack
          direction='row'
          justifyContent='left'
          alignItems='center'
          sx={{
            gap: '1rem' 
          }}
        >
          <div>
            <img
              src={logoG.src}
              style={{
                width: '100px',
                height: '50px',
                objectFit: 'contain',
                cursor: 'pointer'
              }}
              alt='Genome Logo'
              onClick={() =>
                (window.location.href = 'https://genomecanada.ca/')
              }
            />
          </div>

          <div>
            <img
              src={logoOntarioG.src}
              style={{
                width: '100px',
                height: '100px',
                objectFit: 'contain',
                cursor: 'pointer'
              }}
              alt='Genome Ontario Logo'
              onClick={() =>
                (window.location.href = 'https://www.ontariogenomics.ca/')
              }
            />
          </div>
        </Stack>

        <Box sx={{ width: '150px' }}>
          <img
            src={UofG.src}
            style={{
                width: '200px',
                height: '190px',
                objectFit: 'contain',
                cursor: 'pointer'
            }}
            alt="UoG Logo"
            onClick={() => (window.location.href = 'https://www.uoguelph.ca/')}
          />
        </Box>
      </Stack>
    </>
  )
}

export default Footer
