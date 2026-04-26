import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface ImagePasteOptions {
  maxWidth: number
  maxHeight: number
  quality: number
  maxSize: number
  allowedFormats: string[]
  onUpload: (file: File, options: ImagePasteOptions) => Promise<string | null>
}

type UploadResult = {
  path: string
  base64: string
}

const DEFAULT_OPTIONS: ImagePasteOptions = {
  maxWidth: 1200,
  maxHeight: 800,
  quality: 85,
  maxSize: 5 * 1024 * 1024,
  allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  onUpload: async () => null
}

export const ImagePaste = Extension.create<ImagePasteOptions>({
  name: 'imagePaste',

  addOptions() {
    return DEFAULT_OPTIONS
  },

  addProseMirrorPlugins() {
    const options = this.options

    return [
      new Plugin({
        key: new PluginKey('imagePaste'),
        props: {
          handlePaste: (view, event) => {
            const items = event.clipboardData?.items
            if (!items) return false

            const imageItems: DataTransferItem[] = []
            for (let i = 0; i < items.length; i++) {
              const item = items[i]
              if (item.type.startsWith('image/')) {
                imageItems.push(item)
              }
            }

            if (imageItems.length === 0) return false

            event.preventDefault()

            for (const item of imageItems) {
              const file = item.getAsFile()
              if (!file) continue

              const ext = file.name.split('.').pop()?.toLowerCase() || ''
              if (!options.allowedFormats.includes(ext)) {
                console.warn(`Image format ${ext} not allowed`)
                continue
              }

              if (file.size > options.maxSize) {
                console.warn(`Image size ${file.size} exceeds max ${options.maxSize}`)
                continue
              }

              options.onUpload(file, options).then((result) => {
                if (result) {
                  view.dispatch(
                    view.state.tr.replaceSelectionWith(
                      view.state.schema.nodes.image.create({
                        src: result
                      })
                    )
                  )
                }
              })
            }

            return true
          },
          handleDrop: (view, event) => {
            if (!event.dataTransfer) return false

            const files = event.dataTransfer.files
            if (!files || files.length === 0) return false

            const imageFiles: File[] = []
            for (let i = 0; i < files.length; i++) {
              const file = files[i]
              if (file.type.startsWith('image/')) {
                imageFiles.push(file)
              }
            }

            if (imageFiles.length === 0) return false

            event.preventDefault()

            for (const file of imageFiles) {
              const ext = file.name.split('.').pop()?.toLowerCase() || ''
              if (!options.allowedFormats.includes(ext)) {
                console.warn(`Image format ${ext} not allowed`)
                continue
              }

              if (file.size > options.maxSize) {
                console.warn(`Image size ${file.size} exceeds max ${options.maxSize}`)
                continue
              }

              options.onUpload(file, options).then((result) => {
                if (result) {
                  view.dispatch(
                    view.state.tr.replaceSelectionWith(
                      view.state.schema.nodes.image.create({
                        src: result
                      })
                    )
                  )
                }
              })
            }

            return true
          }
        }
      })
    ]
  }
})

export async function uploadImageWithResize(
  file: File,
  options: ImagePasteOptions
): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string
      if (!base64) {
        resolve(null)
        return
      }

      const img = new Image()
      img.onload = async () => {
        let width = img.width
        let height = img.height

        if (width > options.maxWidth || height > options.maxHeight) {
          const ratio = Math.min(options.maxWidth / width, options.maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(base64)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        const resizedBase64 = canvas.toDataURL('image/jpeg', options.quality / 100)

        try {
          const result = await window.electron.image.uploadFromBase64(resizedBase64, {
            maxSize: options.maxSize,
            allowedFormats: options.allowedFormats,
            maxWidth: options.maxWidth,
            maxHeight: options.maxHeight,
            quality: options.quality
          })

          if (result) {
            const storedBase64 = await window.electron.image.readAsBase64(result.path)
            resolve(storedBase64)
          } else {
            resolve(resizedBase64)
          }
        } catch (error) {
          console.error('Failed to upload image:', error)
          resolve(resizedBase64)
        }
      }
      img.onerror = () => {
        resolve(null)
      }
      img.src = base64
    }
    reader.onerror = () => {
      resolve(null)
    }
    reader.readAsDataURL(file)
  })
}

export default ImagePaste
