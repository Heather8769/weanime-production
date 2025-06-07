'use client'

import { useState } from 'react'
import { useBackendSearch } from '@/hooks/use-backend-search'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Loader2, AlertCircle } from 'lucide-react'

interface BackendSearchProps {
  onAnimeSelect?: (anime: { title: string; slug: string }) => void
}

export function BackendSearch({ onAnimeSelect }: BackendSearchProps) {
  const [query, setQuery] = useState('')
  const { data, isLoading, error, isFetching } = useBackendSearch(query)

  const handleAnimeClick = (anime: { title: string; slug: string }) => {
    if (onAnimeSelect) {
      onAnimeSelect(anime)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search anime from backend..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {(isLoading || isFetching) && (
          <div className="flex items-center">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Search failed: {error.message}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {data?.results && data.results.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Found {data.results.length} results
          </h3>
          <div className="grid gap-2">
            {data.results.map((anime, index) => (
              <Card 
                key={index} 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleAnimeClick(anime)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{anime.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Slug: {anime.slug}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Select
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {data?.results && data.results.length === 0 && query.length >= 2 && !isLoading && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-center text-muted-foreground">
              No anime found for "{query}"
            </p>
          </CardContent>
        </Card>
      )}

      {query.length > 0 && query.length < 2 && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-center text-muted-foreground text-sm">
              Type at least 2 characters to search
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
