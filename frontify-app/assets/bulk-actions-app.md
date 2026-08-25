# Template: Bulk Actions App

## Description

Demonstrates how to use the Bulk Actions Surface for performing operations on multiple selected assets. This example implements bulk renaming with find-and-replace functionality using GraphQL queries and mutations via the Frontify platform API.

## Key Concepts

- `assetBulkActions` surface in manifest.json for bulk operations across libraries
- `appBridge.api({ name: 'executeGraphQl', payload: { query } })` for running GraphQL
- `context.selection.assets.ids` to get IDs of selected assets
- Chunked processing for large asset sets (100 per chunk)
- Declared under multiple project types: `mediaLibrary`, `iconLibrary`, `logoLibrary`, `documentLibrary`, `workspace`

## Additional Dependencies

None beyond the Hello World base. Uses `@frontify/fondue` components including `ScrollArea` from `@frontify/fondue/components` and `IconTypographyMultiple` from `@frontify/fondue/icons`.

## Files That Differ From Hello World

### File: manifest.json

```json
{
  "appId": "",
  "appType": "platform-app",
  "name": "bulk-actions-app",
  "metadata": {
    "version": 1
  },
  "permissions": {
    "scopes": ["basic:read", "basic:write"]
  },
  "surfaces": {
    "mediaLibrary": {
      "assetBulkActions": {
        "title": "Bulk Rename Assets",
        "filenameExtensions": ["mp3", "wav", "flac", "mp4", "mov", "avi", "jpg", "jpeg", "png", "gif", "svg", "webp", "psd", "ai", "sketch", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "json", "xml", "yaml", "csv", "sql", "html", "css", "js", "ts", "jsx", "tsx", "vue", "react", "angular", "svelte", "tiff", "tif", "bmp", "ico", "webm", "flv", "mkv", "m4a", "aac", "ogg", "wma", "aiff", "alac", "dsd", "dsf", "dff", "wv", "ape"]
      }
    },
    "iconLibrary": {
      "assetBulkActions": {
        "title": "Bulk Rename Assets",
        "filenameExtensions": ["svg"]
      }
    },
    "logoLibrary": {
      "assetBulkActions": {
        "title": "Bulk Rename Assets",
        "filenameExtensions": ["svg", "jpg", "jpeg", "ai", "eps", "png", "tif", "tiff"]
      }
    },
    "documentLibrary": {
      "assetBulkActions": {
        "title": "Bulk Rename Assets",
        "filenameExtensions": ["mp3", "wav", "flac", "mp4", "mov", "avi", "jpg", "jpeg", "png", "gif", "svg", "webp", "psd", "ai", "sketch", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "json", "xml", "yaml", "csv", "sql", "html", "css", "js", "ts", "jsx", "tsx", "vue", "react", "angular", "svelte", "tiff", "tif", "bmp", "ico", "webm", "flv", "mkv", "m4a", "aac", "ogg", "wma", "aiff", "alac", "dsd", "dsf", "dff", "wv", "ape"]
      }
    },
    "workspace": {
      "assetBulkActions": {
        "title": "Bulk Rename Assets",
        "filenameExtensions": ["mp3", "wav", "flac", "mp4", "mov", "avi", "jpg", "jpeg", "png", "gif", "svg", "webp", "psd", "ai", "sketch", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "json", "xml", "yaml", "csv", "sql", "html", "css", "js", "ts", "jsx", "tsx", "vue", "react", "angular", "svelte", "tiff", "tif", "bmp", "ico", "webm", "flv", "mkv", "m4a", "aac", "ogg", "wma", "aiff", "alac", "dsd", "dsf", "dff", "wv", "ape"]
      }
    }
  }
}
```

### File: src/settings.ts

```typescript
import { defineSettings } from '@frontify/platform-app';

export const settings = defineSettings({
    credentials: [
        {
            type: 'input',
            id: 'single-line',
            label: 'Input field',
            defaultValue: 'Input Field Value',
        },
    ],
});
```

### File: src/helpers/graphql.ts

```typescript
export const getAssetsByIds = (assetIds: string[]) => `
    query GetAssetsByIds {
        assets(ids: [${assetIds.map((id) => `"${id}"`)}]) {
            id
            title
            ... on Image {
                previewUrl
                extension
            }
        }
    }
`;

export const updateAssetTitle = (assetId: string, newTitle: string) => `
    mutation UpdateAssetTitle {
        updateAsset(input: {id: "${assetId}", data: {title: "${newTitle}"}}) {
            asset {
                id
                title
                ... on Image {
                    previewUrl
                    extension
                }
            }
        }
    }
`;
```

### File: src/App.tsx

```tsx
import { AppBridgePlatformApp } from '@frontify/app-bridge-app';
import { Heading, Stack, Text, TextInput } from '@frontify/fondue';
import { Button, ScrollArea } from '@frontify/fondue/components';
import { IconTypographyMultiple } from '@frontify/fondue/icons';
import { useEffect, useMemo, useState } from 'react';
import { getAssetsByIds, updateAssetTitle } from './helpers/graphql';

const highlightMatches = (filename: string, query: string, matchCase: boolean) => {
    if (!query) {
        return { highlightedText: filename, matchCount: 0 };
    }

    const parts = filename.split(new RegExp(`(${query})`, matchCase ? 'i' : 'gi'));
    const matchCount = parts.filter((part) => {
        return matchCase ? part === query : part.toLowerCase() === query.toLowerCase();
    }).length;
    const highlightedText = parts.map((part, index) => {
        if (matchCase ? part === query : part.toLowerCase() === query.toLowerCase()) {
            return (
                <span key={index} className="tw-bg-box-negative-strong">
                    {part}
                </span>
            );
        }

        return part;
    });

    return { highlightedText, matchCount };
};

const quantify = (noun: 'asset' | 'match', count: number) => {
    const plurals = {
        asset: 'assets',
        match: 'matches',
    };

    return `${count} ${count === 1 ? noun : plurals[noun]}`;
};

const getResultCount = (matchCount: number, assetCount: number) => {
    if (matchCount === 0) {
        return 'No matches';
    }

    return `${quantify('match', matchCount)} in ${quantify('asset', assetCount)}`;
};

const chunkArray = (array: string[], size: number) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
};

type Asset = { id: string; previewUrl: string; title: string; extension: string };

export const App = () => {
    const appBridge = useMemo(() => new AppBridgePlatformApp(), []);
    const context = appBridge.context().get();

    const [assets, setAssets] = useState<Asset[]>([]);
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [matchCount, setMatchCount] = useState(0);
    const [matchingAssets, setMatchingAssets] = useState<Asset[]>([]);
    const [renamingInProgress, setRenamingInProgress] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const [matchCase, setMatchCase] = useState(false);

    const assetsAreFetched = assets.length > 0;
    const matchingAssetCount = matchingAssets.length;

    const handleFindTextChange = (value: string) => {
        setProgressMessage('');
        setFindText(value);
    };

    const handleReplaceTextChange = (value: string) => {
        setProgressMessage('');
        setReplaceText(value);
    };

    const renameAssets = async () => {
        let index = 1;

        setRenamingInProgress(true);

        for (const asset of matchingAssets) {
            setProgressMessage(`Renaming ${index} of ${quantify('asset', matchingAssetCount)} ...`);

            const newTitle = asset.title.replace(new RegExp(findText, 'gi'), replaceText);

            try {
                const response = await appBridge.api({
                    name: 'executeGraphQl',
                    payload: {
                        query: updateAssetTitle(asset.id, newTitle),
                    },
                });

                asset.title = response.updateAsset.asset.title;
                index++;
            } catch (error) {
                console.error(`Error renaming asset ${asset.id} from ${asset.title} to ${newTitle}`, error);
            }

            setAssets(assets);
        }

        setRenamingInProgress(false);
        setMatchCount(0);
        setProgressMessage(`Finished renaming ${quantify('asset', matchingAssetCount)}`);
    };

    useEffect(() => {
        const fetchAssets = async () => {
            if (context.surface !== 'assetBulkActions') {
                return;
            }

            const assetIds = context.selection.assets.ids;
            const chunks = chunkArray(assetIds, 100);
            const allAssets = [];

            for (const chunk of chunks) {
                const response = await appBridge.api({
                    name: 'executeGraphQl',
                    payload: { query: getAssetsByIds(chunk) },
                });

                allAssets.push(...response.assets);
            }

            setAssets(allAssets);
        };

        fetchAssets();
    }, [context.selection.assets.ids, appBridge, context.surface]);

    useEffect(() => {
        let totalMatchCount = 0;
        const matchedAssets: Asset[] = [];

        assets.forEach((asset) => {
            const { matchCount } = highlightMatches(asset.title, findText, matchCase);

            if (matchCount > 0) {
                matchedAssets.push(asset);
            }

            totalMatchCount += matchCount;
        });

        setMatchCount(totalMatchCount);
        setMatchingAssets(matchedAssets);
    }, [findText, assets, matchCase]);

    return (
        <div className="tw-flex tw-flex-col tw-py-10 tw-px-10 tw-gap-y-6">
            <Heading size="xx-large" weight="strong">
                Bulk Rename Assets
            </Heading>
            <div className="tw-flex tw-flex-col tw-gap-y-2">
                <div className="tw-flex tw-items-center tw-gap-x-2">
                    <div className="tw-w-[200px]">
                        <TextInput
                            id="find"
                            placeholder="Find"
                            disabled={!assetsAreFetched}
                            value={findText}
                            onChange={handleFindTextChange}
                            onEnterPressed={() => { }}
                            onBlur={() => { }}
                            extraActions={[
                                {
                                    icon: (
                                        <IconTypographyMultiple size={16} color={`${matchCase ? 'black' : 'gray'}`} />
                                    ),
                                    onClick: () => setMatchCase(!matchCase),
                                    title: 'Extra action A',
                                    tooltip: {
                                        content: `Match Case: ${matchCase ? 'on' : 'off'}`,
                                        withArrow: true,
                                    },
                                },
                            ]}
                        />
                    </div>
                    <Text>{getResultCount(matchCount, matchingAssetCount)}</Text>
                </div>
                <div className="tw-flex tw-gap-x-1 tw-items-center">
                    <div className="tw-w-[200px]">
                        <TextInput
                            id="replace"
                            placeholder="Replace"
                            disabled={!assetsAreFetched}
                            value={replaceText}
                            onChange={handleReplaceTextChange}
                            onEnterPressed={() => { }}
                            onBlur={() => { }}
                        />
                    </div>
                    <Button disabled={matchCount === 0 || renamingInProgress} onPress={renameAssets}>
                        Rename all
                    </Button>
                </div>
                <div className="tw-flex tw-h-4">
                    <Text size="small">{progressMessage}</Text>
                </div>
            </div>
            <ScrollArea maxHeight="50vh" maxWidth="66%" type="scroll">
                {assetsAreFetched ? (
                    <div className="tw-border tw-px-2 tw-rounded">
                        {assets.map((asset) => {
                            const { highlightedText } = highlightMatches(asset.title, findText, matchCase);

                            return (
                                <Stack direction="row" marginY={4} padding={4} key={asset.id}>
                                    <Text size="medium">
                                        <span className="tw-text-text">{highlightedText}</span>
                                        <span className="tw-text-text-weak">.{asset.extension}</span>
                                    </Text>
                                </Stack>
                            );
                        })}
                    </div>
                ) : (
                    <Text size="large" as="em">
                        Gathering names of selected assets ...
                    </Text>
                )}
            </ScrollArea>
        </div>
    );
};
```

## Integration Notes

- The `assetBulkActions` surface is separate from `assetAction` and `assetCreation` - it appears when multiple assets are selected
- GraphQL queries/mutations are executed via `appBridge.api({ name: 'executeGraphQl', payload: { query } })`
- Process assets in chunks (100 at a time) to avoid API limits
- The bulk action can span multiple project types (media, icon, logo, document, workspace)
- Adjust the `filenameExtensions` array in the manifest to control which asset types the bulk action applies to
