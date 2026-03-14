import { useEffect, useMemo, useState } from 'react'
import ProductEditor from './ProductEditor.jsx'
import ProductsList from './ProductsList.jsx'

const DEFAULT_OWNER = import.meta.env.VITE_GITHUB_OWNER || 'FedericoSecchi'
const DEFAULT_REPO = import.meta.env.VITE_GITHUB_REPO || 'Nude-Beauty-Web'
const DEFAULT_BRANCH = import.meta.env.VITE_GITHUB_BRANCH || 'main'

const emptyProduct = () => ({
  id: '',
  title: '',
  description: '',
  price: 0,
  images: []
})

const normalizeProduct = (product, id, sha) => {
  if (!id) return null
  const title = product.title || product.name || 'Producto'
  const description = product.description || ''
  const priceRaw = product.price ?? 0
  const parsedPrice = Number.parseFloat(String(priceRaw).trim().replace(',', '.'))
  const price = Number.isFinite(parsedPrice) ? parsedPrice : 0
  const images = Array.isArray(product.images)
    ? product.images
    : product.image
      ? [product.image]
      : []

  return {
    id,
    title,
    description,
    price,
    images,
    _sha: sha || null
  }
}

const parseDirectoryListing = (html) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const links = Array.from(doc.querySelectorAll('a'))
  return links
    .map((link) => link.getAttribute('href') || '')
    .map((href) => {
      try {
        const url = new URL(href, `${window.location.origin}/products/`)
        const parts = url.pathname.split('/')
        return parts[parts.length - 1]
      } catch {
        return ''
      }
    })
    .filter((name) => name.endsWith('.json'))
    .filter((name) => name !== 'index.json')
}

const fetchJson = async (url) => {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }
  return response.json()
}

function App() {
  const [products, setProducts] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [settings, setSettings] = useState({
    owner: DEFAULT_OWNER,
    repo: DEFAULT_REPO,
    branch: DEFAULT_BRANCH,
    token: '',
    useGitHub: false
  })

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === selectedId) || null,
    [products, selectedId]
  )

  const loadFromPublicListing = async () => {
    const listing = await fetch('/products/', { cache: 'no-store' })
    if (!listing.ok) {
      throw new Error(`HTTP ${listing.status} loading /products/`)
    }
    const html = await listing.text()
    const filenames = parseDirectoryListing(html)
    const uniqueNames = Array.from(new Set(filenames))
    const items = []
    for (const filename of uniqueNames) {
      try {
        const data = await fetchJson(`/products/${filename}`)
        const id = filename.replace(/\.json$/i, '')
        const normalized = normalizeProduct(data, id)
        if (normalized) {
          items.push(normalized)
        }
      } catch (err) {
        console.warn(`Skipping ${filename}`, err)
      }
    }
    return items
  }

  const loadFromGitHub = async () => {
    const { owner, repo, branch, token } = settings
    if (!owner || !repo || !token) {
      return []
    }
    const listResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/products?ref=${branch}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json'
        }
      }
    )
    if (!listResponse.ok) {
      throw new Error(`GitHub list failed (${listResponse.status})`)
    }
    const list = await listResponse.json()
    const jsonFiles = Array.isArray(list)
      ? list.filter((item) => item.type === 'file' && item.name.endsWith('.json'))
      : []

    const items = []
    for (const file of jsonFiles) {
      if (file.name === 'index.json') continue
      try {
        const data = await fetchJson(file.download_url)
        const id = file.name.replace(/\.json$/i, '')
        const normalized = normalizeProduct(data, id, file.sha)
        if (normalized) {
          items.push(normalized)
        }
      } catch (err) {
        console.warn(`Skipping ${file.name}`, err)
      }
    }
    return items
  }

  const loadProducts = async () => {
    setLoading(true)
    setError('')
    try {
      let items = []
      try {
        items = await loadFromPublicListing()
      } catch (listingError) {
        if (settings.useGitHub) {
          items = await loadFromGitHub()
        } else {
          throw listingError
        }
      }
      setProducts(items)
      setSelectedId(items[0]?.id || '')
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los productos.')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleProductChange = (updated) => {
    setProducts((prev) =>
      prev.map((item) => (item.id === selectedId ? updated : item))
    )
    if (updated.id && updated.id !== selectedId) {
      setSelectedId(updated.id)
    }
  }

  const handleCreate = () => {
    const fresh = emptyProduct()
    setProducts((prev) => [fresh, ...prev])
    setSelectedId(fresh.id)
  }

  const updateSettings = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
  }

  const saveProduct = async (product) => {
    if (!settings.token) {
      setNotice('Agrega un token de GitHub para guardar cambios.')
      return
    }
    const id = product.id.trim()
    if (!id) {
      setNotice('El ID (nombre de archivo) es obligatorio.')
      return
    }

    setSaving(true)
    setNotice('')
    try {
      const { owner, repo, branch, token } = settings
      const path = `products/${id}.json`
      const contentBody = JSON.stringify(
        {
          title: product.title,
          description: product.description,
          price: product.price,
          images: product.images
        },
        null,
        2
      )
      const content = btoa(unescape(encodeURIComponent(contentBody)))

      let sha = product._sha
      if (!sha) {
        const existing = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github+json'
            }
          }
        )
        if (existing.ok) {
          const data = await existing.json()
          sha = data.sha
        }
      }

      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json'
          },
          body: JSON.stringify({
            message: `chore: update ${path}`,
            content,
            branch,
            sha: sha || undefined
          })
        }
      )

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.message || 'No se pudo guardar el producto.')
      }

      setNotice('Producto guardado en GitHub.')
      await loadProducts()
    } catch (err) {
      setNotice(err.message || 'No se pudo guardar el producto.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Nude Admin</h1>
            <p className="text-sm text-neutral-500">Gestión de productos</p>
          </div>
          <button
            onClick={loadProducts}
            className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-400"
          >
            Refrescar
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1.2fr_1fr]">
        <section className="space-y-4">
          <ProductsList
            products={products}
            selectedId={selectedId}
            loading={loading}
            error={error}
            onSelect={setSelectedId}
            onCreate={handleCreate}
          />
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">GitHub settings</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <label className="grid gap-1">
                Owner
                <input
                  value={settings.owner}
                  onChange={(event) => updateSettings('owner', event.target.value)}
                  className="rounded-lg border border-neutral-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-1">
                Repo
                <input
                  value={settings.repo}
                  onChange={(event) => updateSettings('repo', event.target.value)}
                  className="rounded-lg border border-neutral-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-1">
                Branch
                <input
                  value={settings.branch}
                  onChange={(event) => updateSettings('branch', event.target.value)}
                  className="rounded-lg border border-neutral-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-1">
                GitHub token
                <input
                  type="password"
                  value={settings.token}
                  onChange={(event) => updateSettings('token', event.target.value)}
                  className="rounded-lg border border-neutral-200 px-3 py-2"
                  placeholder="ghp_..."
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.useGitHub}
                  onChange={(event) => updateSettings('useGitHub', event.target.checked)}
                />
                Use GitHub API if /products/ listing is unavailable
              </label>
            </div>
          </div>

          <ProductEditor
            product={selectedProduct}
            onChange={handleProductChange}
            onSave={saveProduct}
            saving={saving}
            notice={notice}
          />
        </section>
      </main>
    </div>
  )
}

export default App
