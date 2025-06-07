import { NextRequest, NextResponse } from 'next/server'

// Mock subtitle content for different languages
const SUBTITLE_CONTENT = {
  english: `WEBVTT

00:00:01.000 --> 00:00:05.000
Welcome to the world of anime streaming!

00:00:05.000 --> 00:00:10.000
This is a demo subtitle for testing purposes.

00:00:10.000 --> 00:00:15.000
In a real application, these would be actual subtitles.

00:00:15.000 --> 00:00:20.000
The video player supports multiple subtitle tracks.

00:00:20.000 --> 00:00:25.000
You can switch between different languages.`,

  japanese: `WEBVTT

00:00:01.000 --> 00:00:05.000
アニメストリーミングの世界へようこそ！

00:00:05.000 --> 00:00:10.000
これはテスト用のデモ字幕です。

00:00:10.000 --> 00:00:15.000
実際のアプリケーションでは、これらは実際の字幕になります。

00:00:15.000 --> 00:00:20.000
ビデオプレーヤーは複数の字幕トラックをサポートしています。

00:00:20.000 --> 00:00:25.000
異なる言語間で切り替えることができます。`,

  spanish: `WEBVTT

00:00:01.000 --> 00:00:05.000
¡Bienvenido al mundo del streaming de anime!

00:00:05.000 --> 00:00:10.000
Este es un subtítulo de demostración para propósitos de prueba.

00:00:10.000 --> 00:00:15.000
En una aplicación real, estos serían subtítulos reales.

00:00:15.000 --> 00:00:20.000
El reproductor de video soporta múltiples pistas de subtítulos.

00:00:20.000 --> 00:00:25.000
Puedes cambiar entre diferentes idiomas.`,

  french: `WEBVTT

00:00:01.000 --> 00:00:05.000
Bienvenue dans le monde du streaming d'anime !

00:00:05.000 --> 00:00:10.000
Ceci est un sous-titre de démonstration à des fins de test.

00:00:10.000 --> 00:00:15.000
Dans une vraie application, ce seraient de vrais sous-titres.

00:00:15.000 --> 00:00:20.000
Le lecteur vidéo prend en charge plusieurs pistes de sous-titres.

00:00:20.000 --> 00:00:25.000
Vous pouvez basculer entre différentes langues.`,

  german: `WEBVTT

00:00:01.000 --> 00:00:05.000
Willkommen in der Welt des Anime-Streamings!

00:00:05.000 --> 00:00:10.000
Dies ist ein Demo-Untertitel für Testzwecke.

00:00:10.000 --> 00:00:15.000
In einer echten Anwendung wären dies echte Untertitel.

00:00:15.000 --> 00:00:20.000
Der Videoplayer unterstützt mehrere Untertitelspuren.

00:00:20.000 --> 00:00:25.000
Sie können zwischen verschiedenen Sprachen wechseln.`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const animeId = searchParams.get('animeId')
    const episode = searchParams.get('episode')
    const language = searchParams.get('language')
    
    if (!animeId || !episode || !language) {
      return NextResponse.json(
        { error: 'Missing required parameters: animeId, episode, language' },
        { status: 400 }
      )
    }

    // Get subtitle content for the requested language
    const subtitleContent = SUBTITLE_CONTENT[language as keyof typeof SUBTITLE_CONTENT]
    
    if (!subtitleContent) {
      return NextResponse.json(
        { error: `Unsupported language: ${language}` },
        { status: 404 }
      )
    }

    // Return subtitle content as WebVTT
    return new NextResponse(subtitleContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/vtt',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('Subtitle API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subtitles' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
