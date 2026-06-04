const BLOCK_END_TAGS: &[&str] = &[
    "</p>", "</h1>", "</h2>", "</h3>", "</h4>", "</h5>", "</h6>",
    "</div>", "</blockquote>", "</li>", "</section>", "</article>",
];

pub fn split_html_blocks(content: &str) -> Vec<String> {
    let mut blocks: Vec<String> = Vec::new();
    let mut current = String::new();

    for ch in content.chars() {
        current.push(ch);
        if ch == '>' {
            let trimmed = current.trim_end();
            for tag in BLOCK_END_TAGS {
                if trimmed.ends_with(tag) {
                    blocks.push(current.trim().to_string());
                    current.clear();
                    break;
                }
            }
        }
    }

    if !current.trim().is_empty() {
        blocks.push(current.trim().to_string());
    }

    blocks
}

pub fn strip_html_tags(html: &str) -> String {
    let mut text = String::new();
    let mut in_tag = false;
    for ch in html.chars() {
        if ch == '<' {
            in_tag = true;
        } else if ch == '>' {
            in_tag = false;
        } else if !in_tag {
            text.push(ch);
        }
    }
    text.trim().to_string()
}

pub fn html_to_plain_text(html: &str) -> String {
    let blocks = split_html_blocks(html);
    let mut paragraphs: Vec<String> = Vec::new();

    for block in blocks {
        let text = strip_html_tags(&block);
        if !text.is_empty() {
            paragraphs.push(text);
        }
    }

    paragraphs.join("\n\n")
}

fn wrap_in_tag(text: &str, block: &str) -> String {
    if let Some(tag_start) = block.find('<') {
        if let Some(tag_end) = block[tag_start..].find('>') {
            let tag_with_attrs = &block[tag_start + 1..tag_start + tag_end];
            let tag_name = tag_with_attrs.split_whitespace().next().unwrap_or("p");
            return format!("<{}>{}</{}>", tag_with_attrs, text, tag_name);
        }
    }
    format!("<p>{}</p>", text)
}

pub fn edit_novel_html(html: &str, old_string: &str, new_string: &str) -> Option<String> {
    // 先尝试在原始 HTML 中直接搜索
    if html.contains(old_string) {
        return Some(html.replacen(old_string, new_string, 1));
    }

    let blocks = split_html_blocks(html);
    let old_paras: Vec<&str> = old_string
        .split("\n\n")
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect();
    let new_paras: Vec<&str> = new_string
        .split("\n\n")
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect();

    // 多段落替换：查找连续匹配的块序列
    if old_paras.len() > 1 {
        for i in 0..blocks.len() {
            if i + old_paras.len() > blocks.len() {
                break;
            }
            let mut matched = true;
            for (j, old_para) in old_paras.iter().enumerate() {
                let block_text = strip_html_tags(&blocks[i + j]);
                if !block_text.contains(old_para) {
                    matched = false;
                    break;
                }
            }
            if matched {
                let mut new_blocks = blocks.clone();
                let replacement: Vec<String> = new_paras
                    .iter()
                    .enumerate()
                    .map(|(j, para)| {
                        if j < old_paras.len() {
                            wrap_in_tag(para, &blocks[i + j])
                        } else {
                            format!("<p>{}</p>", para)
                        }
                    })
                    .collect();
                new_blocks.splice(i..i + old_paras.len(), replacement);
                return Some(new_blocks.join(""));
            }
        }
    }

    // 单段落替换
    for (i, block) in blocks.iter().enumerate() {
        let text = strip_html_tags(block);
        if text.contains(old_string) {
            let new_text = text.replacen(old_string, new_string, 1);
            let mut new_blocks = blocks.clone();
            new_blocks[i] = wrap_in_tag(&new_text, block);
            return Some(new_blocks.join(""));
        }
    }

    None
}

pub fn plain_text_to_html(text: &str) -> String {
    let paragraphs: Vec<String> = text
        .split("\n\n")
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| format!("<p>{}</p>", s))
        .collect();
    paragraphs.join("\n")
}

pub fn extract_block_context(html: &str, block_idx: usize, radius: usize) -> String {
    let blocks = split_html_blocks(html);
    if blocks.is_empty() {
        return html_to_plain_text(html);
    }
    let start = block_idx.saturating_sub(radius);
    let end = (block_idx + radius + 1).min(blocks.len());
    let selected: Vec<String> = blocks[start..end]
        .iter()
        .map(|b| strip_html_tags(b))
        .filter(|t| !t.is_empty())
        .collect();
    selected.join("\n\n")
}

pub fn find_first_diff_block(old_html: &str, new_html: &str) -> Option<usize> {
    let old_blocks = split_html_blocks(old_html);
    let new_blocks = split_html_blocks(new_html);
    let max_len = old_blocks.len().max(new_blocks.len());
    for i in 0..max_len {
        let old_text = old_blocks.get(i).map(|b| strip_html_tags(b)).unwrap_or_default();
        let new_text = new_blocks.get(i).map(|b| strip_html_tags(b)).unwrap_or_default();
        if old_text != new_text {
            return Some(i);
        }
    }
    None
}
